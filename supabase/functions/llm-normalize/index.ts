// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SYSTEM = `You are a strict information normalizer for Japanese job postings.
## General
- Output MUST be a single JSON object matching the provided JSON Schema.
- If you are NOT confident a field is correct, OMIT that field entirely.
- Do not invent information. Do not output placeholders like "不明".
- Keep descriptions concise. "description" should be <= 120 Japanese characters and deterministic (no emojis).
- Numbers should be half-width. Salary fields are in 万円.
- For "workStyle", only use one of: "remote" | "onsite" | "hybrid".
- Use short bullet-like phrases; avoid polite filler.

## Sections to extract (when present)
- 案件詳細: Put short 1-2 sentence "description".
- 業務内容: Merge a concise overview into "detailedDescription" (<= 300 chars).
- 募集背景: Into "recruitmentBackground".
- 開発環境: Skill stack into "mustSkills"/"niceSkills" appropriately.
- NG条件: Do NOT copy verbatim unless clearly relevant; otherwise omit.

## Languages & Years
- Detect languages/tech (e.g., Java 3年, Python 2年以上, React 2年, Go 1年以上).
- Put into languageYears as { "Java": "3年", "Python": "2年以上" }.
- If there is a range (例: 2〜3年), keep the original like "2〜3年".
`;

// ---- Utility helpers -------------------------------------------------------
function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function mergeMissing(base: Record<string, unknown>, fill: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(fill)) {
    if (v === undefined || v === null) continue;
    if (!(k in out) || out[k] === "" || out[k] === null || out[k] === undefined) {
      out[k] = v;
    }
  }
  return out;
}

function manFromYen(n: number) {
  // 1万円 = 10,000円
  return Math.round((n / 10000) * 10) / 10; // 小数1位まで
}

function parseMoneyTextToMan(text: string): number | undefined {
  // 例: "月給 80〜110万円", "月単価80万〜110万", "800,000円〜1,100,000円/月"
  const yenRange = text.match(/(\d[\d,]{3,})\s*円(?:\/月|月)?\s*[〜\-~]\s*(\d[\d,]{3,})\s*円/);
  if (yenRange) {
    const min = Number(yenRange[1].replace(/,/g, ""));
    const max = Number(yenRange[2].replace(/,/g, ""));
    return manFromYen((min + max) / 2);
  }
  const manRange = text.match(/(\d+(?:\.\d+)?)\s*万[円]?\s*[〜\-~]\s*(\d+(?:\.\d+)?)\s*万/);
  if (manRange) {
    // ここでは平均を返すのではなく、呼び出し側で min/max を個別に使うため undefined を返し、
    // 個別抽出関数で扱う。
    return undefined;
  }
  const manSingle = text.match(/(\d+(?:\.\d+)?)\s*万[円]?/);
  if (manSingle) return Number(manSingle[1]);
  return undefined;
}

function extractSalaryRangeMan(text?: string | null) {
  if (!text) return {};
  const manRange = text.match(/(\d+(?:\.\d+)?)\s*万[円]?\s*[〜\-~]\s*(\d+(?:\.\d+)?)/);
  if (manRange) {
    return { budgetMin: Number(manRange[1]), budgetMax: Number(manRange[2]) };
  }
  const yenRange = text.match(/(\d[\d,]{3,})\s*円(?:\/月|月)?\s*[〜\-~]\s*(\d[\d,]{3,})\s*円/);
  if (yenRange) {
    const min = Number(yenRange[1].replace(/,/g, ""));
    const max = Number(yenRange[2].replace(/,/g, ""));
    return { budgetMin: manFromYen(min), budgetMax: manFromYen(max) };
  }
  const single = parseMoneyTextToMan(text);
  if (typeof single === "number") {
    return { budgetMin: single, budgetMax: single };
  }
  return {};
}

function extractWorkStyle(text?: string | null): "remote" | "onsite" | "hybrid" | undefined {
  if (!text) return;
  const t = text.toLowerCase();
  if (/フルリモート|完全リモート|remote/.test(t)) return "remote";
  if (/一部出社|週\d日出社|ハイブリッド|hybrid/.test(t)) return "hybrid";
  if (/常駐|出社|オンサイト|office|現場/.test(t)) return "onsite";
  return;
}

function extractLocation(text?: string | null): string | undefined {
  if (!text) return;
  const m = text.match(/(東京都|神奈川県|千葉県|埼玉県|大阪府|京都府|福岡県|名古屋|愛知県|札幌|仙台|横浜|渋谷|新宿|品川|六本木|日本橋|丸の内)/);
  return m?.[1];
}

function compactDescription(s?: string): string | undefined {
  if (!s) return;
  return s.replace(/\s+/g, " ").trim().slice(0, 120);
}

function extractLanguageYearsHeuristics(text?: string | null) {
  if (!text) return {};
  const languages = [
    "JavaScript","TypeScript","Java","Kotlin","Swift","Objective-C","C\\+\\+","C#","C","Go","Rust","Ruby","Python","PHP","Scala","R","Dart","Elixir","Perl","Haskell","React","Vue","Angular","Next\\.js","Nuxt\\.js","GraphQL"
  ];
  const dict: Record<string,string> = {};
  for (const lang of languages) {
    const re = new RegExp(`${lang}\\s*(\\d+\\s*年(?:以上)?|\\d+\\s*\\-\\s*\\d+\\s*年|\\d+\\s*〜\\s*\\d+\\s*年)`, "i");
    const m = text.match(re);
    if (m) dict[lang.replace("\\\\","")] = m[1].replace(/\s+/g,"");
  }
  return dict;
}

// ---- JAPANESE JOB POSTING HEURISTICS (targeting user's input format) -------
function toHalfWidth2(input: string) {
  return input
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}
function clean2(s?: string | null) {
  if (!s) return undefined;
  const v = toHalfWidth2(s)
    .replace(/[\t\r]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return v.length ? v : undefined;
}
function uniqStr(arr: (string|undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[]));
}
const LANG_CANON: Record<string,string> = {
  'react':'React','vue':'Vue','go':'Go','java':'Java','kotlin':'Kotlin','scala':'Scala','c#':'C#','csharp':'C#','typescript':'TypeScript','rust':'Rust',
  'graphql':'GraphQL','google cloud':'Google Cloud','gcp':'Google Cloud','terraform':'Terraform'
};
function canonLang(name: string) {
  const k = name.toLowerCase().trim();
  return LANG_CANON[k] || name.trim();
}
function explodeLangList(s?: string) {
  if (!s) return [] as string[];
  return s.split(/[、・,\/／\s]+/).map(x=>x.trim()).filter(Boolean).map(canonLang);
}
/**
 * Extracts structured fields from a raw Japanese posting like the user's sample.
 * These values will be merged into the AI result if missing.
 */
function extractFromJapanesePosting(raw?: string) {
  if (!raw) return {};
  const t = toHalfWidth2(raw);
  const out: Record<string, unknown> = {};

  // --- simple sections ---
  const pick = (re: RegExp, idx = 1) => {
    const m = t.match(re); return m ? clean2(m[idx]) : undefined;
  };

  // location/workstyle
  if (/フルリモート|完全在宅/i.test(t)) out.workStyle = "remote";
  // attendance / frequency
  const attendance = pick(/出社頻度[：:]\s*([^\n]+)/i) || (/(フルリモート|完全在宅)/i.test(t) ? "フルリモート" : undefined);
  if (attendance) out.attendanceFrequency = attendance;
  // working days
  const days = pick(/稼働日数[：:]\s*週\s*(\d+)\s*日/i);
  if (days) out.workingDays = `週${days}日`;
  // working hours
  const hours = pick(/勤務時間[：:]\s*([^\n]+)/i) || pick(/フレックス（[^)）]+）/i);
  if (hours) out.workingHours = hours;

  // commerce (商流) & commerceLimit (商流制限)
  const commerce = pick(/商流[：:]\s*([^\n]+)/i);
  if (commerce) out.commerceTier = commerce;
  const commerceLimit = pick(/商流制限[：:]\s*([^\n]+)/i);
  if (commerceLimit) out.commerceLimit = commerceLimit;

  // interview count
  const iv = pick(/面談[：:]\s*(\d+)\s*回/i);
  if (iv) out.interviewCount = Number(iv);
  // payment range (e.g., 140h〜180h) — restrict to lines containing 「精算」 and ignore clock times
  {
    const linesP = t.split(/\r?\n/);
    const ctx = linesP.filter((l) => /精算/.test(l)).join(" ");
    if (ctx) {
      const src = toHalfWidth2(ctx);

      // Exclude clock-like patterns such as "10:00〜17:00"
      const looksLikeClock = (s: string) =>
        /(?:^|\s)[0-2]?\d:\d{2}\s*[~〜\-]\s*[0-2]?\d:\d{2}(?:\s|$)/.test(s);

      // Reasonable monthly hour range: 80–259h
      const H = String.raw`(8\d|9\d|1\d{2}|2[0-5]\d)`;

      // 1) Both sides with 'h': "140h〜180h" / "140h-180h"
      let m = src.match(new RegExp(String.raw`\\b${H}\\s*h\\s*[~〜\\-]\\s*${H}\\s*h\\b`, "i"));
      if (m && !looksLikeClock(m[0])) {
        out.paymentRange = `${m[1]}h〜${m[2]}h`;
      } else {
        // 2) Right side with 'h': "140〜180h" / "150-200h"
        m = src.match(new RegExp(String.raw`\\b${H}\\s*[~〜\\-]\\s*${H}\\s*h\\b`, "i"));
        if (m && !looksLikeClock(m[0])) {
          out.paymentRange = `${m[1]}h〜${m[2]}h`;
        } else {
          // 3) Labelled form: "精算幅: 140h〜180h"
          const m2 = src.match(new RegExp(String.raw`精算(?:幅)?[:：]?\\s*${H}\\s*h?\\s*[~〜\\-]\\s*${H}\\s*h\\b`, "i"));
          if (m2 && !looksLikeClock(m2[0])) {
            out.paymentRange = `${m2[1]}h〜${m2[2]}h`;
          }
        }
      }
    }
  }
  // payment term
  const pt = pick(/支払いサイト[：:]\s*([^\n]+)/i) || pick(/(\d{2,3})\s*日サイト/i);
  if (pt) out.paymentTerms = pt;
  // age limit
  const age = pick(/年齢[：:]\s*(\d{2})\s*歳?まで/i);
  if (age) out.ageLimit = Number(age);
  // foreigner acceptable
  if (/外国籍[：:]\s*(NG|不可|×)/i.test(t)) out.foreignerAcceptable = false;
  if (/外国籍[：:]\s*(OK|可|〇|○)/i.test(t)) out.foreignerAcceptable = true;
  // location label
  const loc = pick(/勤務地[：:]\s*([^\n]+)/i) || (/(フルリモート|完全在宅)/i.test(t) ? "フルリモート" : undefined);
  if (loc) out.location = loc;

  // --- languages and skills ---
  // 「下記いずれかのバックエンド開発経験」の列挙抽出
  const backends =
    pick(/下記いずれかのバックエンド開発経験[（(][^）)]*[）)]\s*([\s\S]*?)\n[＜<【]/i, 1) ||
    pick(/下記いずれかのバックエンド開発経験[^\n]*\n([\s\S]*?)(?:\n[•・\-]|【|＜|<|$)/i, 1) ||
    pick(/下記いずれかのバックエンド開発経験[^\n]*?[\s\n]+([^\n]+)/i, 1);
  const backendList = explodeLangList(backends);
  const reactVue = explodeLangList("React Vue");

  // 歓迎スキル
  const niceBlock = pick(/＜尚可＞([\s\S]*?)【/i, 1) || pick(/＜尚可＞([\s\S]*)$/i, 1);
  const niceSkills = niceBlock ? explodeLangList(niceBlock) : [];

  const mustSkillsSet = new Set<string>();
  for (const n of [...reactVue, ...backendList]) mustSkillsSet.add(n);
  out.mustSkills = Array.from(mustSkillsSet);

  const niceSet = new Set<string>(niceSkills);
  if (/GraphQL/i.test(t)) niceSet.add("GraphQL");
  if (/(Google\s*Cloud|GCP)/i.test(t)) niceSet.add("Google Cloud");
  if (/Terraform/i.test(t)) niceSet.add("Terraform");
  out.niceSkills = Array.from(niceSet);

  // 言語年数: 全体の「（2年以上）」があれば必須言語に適用
  const yearsGlobal = /（\s*([0-9]+(?:\.[0-9]+)?)\s*年以上?\s*）/.exec(t)?.[1];
  const yrs = yearsGlobal ? `${yearsGlobal}年以上` : "2年以上";
  const langYears: Record<string,string> = {};
  for (const n of Array.from(mustSkillsSet)) {
    if (["GraphQL","Google Cloud","Terraform"].includes(n)) continue;
    langYears[n] = yrs;
  }
  if (Object.keys(langYears).length) (out as any).languageYears = langYears;

  // description / detailed
  const descSource = pick(/業務内容[：:]\s*([\s\S]*?)(?:\n【|$)/i) || pick(/業務内容：\s*([\s\S]*)/i);
  const descShort = descSource ? compactDescription(descSource) : undefined;
  if (descShort) out.description = descShort;
  if (descSource) out.detailedDescription = descSource;

  // recruitment background
  const bg = pick(/募集背景[：:]\s*([\s\S]*?)(?:\n【|$)/i);
  if (bg) out.recruitmentBackground = bg;

  // NG条件
  const ng = pick(/NG条件[：:]\s*([\s\S]*?)(?:\n{2,}|$)/i);
  if (ng) out.ngConditions = ng;

  return out;
}

const FEW_SHOTS = [
  {
    title: "航空機関連サービス/フルスタック",
    raw: `フロントからバックエンド、インフラ横断。UI/UX設計、GraphQLサーバー設計・実装。React/TypeScript/Go、GCP、Terraform。フルリモート。月80〜110万円。`,
    parsed: {
      description: "フロント〜バックエンド・インフラを横断しGraphQL中心に開発。",
      mustSkills: ["React","TypeScript","Go","GraphQL","GCP","Terraform"],
      workStyle: "remote",
      budgetMin: 80,
      budgetMax: 110,
      languageYears: { React: "2年以上", TypeScript: "2年以上", Go: "1年以上" }
    }
  },
  {
    title: "BFF/モバイル",
    raw: `iOS/Android向けBFFをGoで実装。週2日出社。Pythonもあると歓迎。90〜120万。勤務地:渋谷。`,
    parsed: {
      description: "モバイル向けBFFをGoで実装。",
      mustSkills: ["Go","BFF"],
      niceSkills: ["Python"],
      workStyle: "hybrid",
      budgetMin: 90,
      budgetMax: 120,
      location: "渋谷"
    }
  }
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { instruction, data, rawText } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // ---- Build schema ------------------------------------------------------
    const schema = {
      name: "ProjectNormalization",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string", maxLength: 240 },
          detailedDescription: { type: "string" },
          recruitmentBackground: { type: "string" },
          mustSkills: { type: "array", items: { type: "string" } },
          niceSkills: { type: "array", items: { type: "string" } },
          budgetMin: { type: ["string","number"] },
          budgetMax: { type: ["string","number"] },
          workStyle: { type: "string", enum: ["remote","onsite","hybrid"] },
          startDate: { type: "string" },
          location: { type: "string" },
          workingHours: { type: "string" },
          workingDays: { type: "string" },
          industry: { type: "string" },
          language: { type: "string" },
          languageYears: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        }
      }
    };

    // ---- If no API key: heuristic-only path (dev-safe) --------------------
    if (!OPENAI_API_KEY) {
      const heur = extractLanguageYearsHeuristics(rawText);
      const salary = extractSalaryRangeMan(rawText);
      const ws = extractWorkStyle(rawText);
      const loc = extractLocation(rawText);
      const result: Record<string, unknown> = {
        ...(data ?? {}),
        ...(Object.keys(heur).length ? { languageYears: heur } : {}),
        ...(ws ? { workStyle: ws } : {}),
        ...(loc ? { location: loc } : {}),
        ...salary
      };
      if (isObject(result.languageYears)) {
        (result as any).languageYearsText = Object.entries(result.languageYears as Record<string,string>)
          .map(([k,v]) => `${k} ${v}`).join(", ");
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- OpenAI call with few-shots ---------------------------------------
    const userBlocks = [
      { type: "text", text: instruction ?? "" },
      { type: "text", text: "### RAW_TEXT\n" + (rawText ?? "") },
      { type: "text", text: "### PARSED_DATA\n" + JSON.stringify(data ?? {}, null, 2) },
      { type: "text", text: "### FEW_SHOTS\n" + JSON.stringify(FEW_SHOTS, null, 2) },
    ];

    const body = {
      model: "gpt-4o-mini",
      response_format: { type: "json_schema", json_schema: schema },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userBlocks as any }
      ],
      temperature: 0.15,
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    let parsed: Record<string, unknown> = {};
    if (aiRes.ok) {
      const json = await aiRes.json();
      const content = json.choices?.[0]?.message?.content;
      try {
        parsed = isObject(content) ? content as Record<string, unknown> : JSON.parse(content);
      } catch {
        parsed = {};
      }
    }

    // Heuristics specialized for the user's Japanese posting format
    const fromJa = extractFromJapanesePosting(rawText);
    if (Object.keys(fromJa).length) {
      parsed = mergeMissing(parsed, fromJa as Record<string, unknown>);
    }

    // ---- Heuristics & post-processing -------------------------------------
    const heurLang = extractLanguageYearsHeuristics(rawText);
    if (Object.keys(heurLang).length && !isObject((parsed as any).languageYears)) {
      (parsed as any).languageYears = heurLang;
    }
    const salary = extractSalaryRangeMan(rawText);
    if (salary) {
      if ((parsed as any).budgetMin === undefined) (parsed as any).budgetMin = salary.budgetMin;
      if ((parsed as any).budgetMax === undefined) (parsed as any).budgetMax = salary.budgetMax;
    }
    const ws = extractWorkStyle(rawText);
    if (ws && !(parsed as any).workStyle) (parsed as any).workStyle = ws;
    const loc = extractLocation(rawText);
    if (loc && !(parsed as any).location) (parsed as any).location = loc;
    if ((parsed as any).description) {
      (parsed as any).description = compactDescription(String((parsed as any).description));
    }

    const merged = mergeMissing(isObject(data) ? data as Record<string, unknown> : {}, parsed);
    if (isObject((merged as any).languageYears) && !(merged as any).languageYearsText) {
      (merged as any).languageYearsText = Object.entries((merged as any).languageYears as Record<string,string>)
        .map(([k,v]) => `${k} ${v}`).join(", ");
    }

    return new Response(JSON.stringify(merged), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});