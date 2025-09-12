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
- 開発環境: Copy concise original block into "environmentText". Do NOT add to mustSkills/niceSkills.
- 必須条件/応募要件: Copy concise original bullet block into mustSkillsText (multiline OK).
- 歓迎/尚可/尚良: Copy concise original bullet block into niceSkillsText (multiline OK).
- NG条件: Do NOT copy verbatim unless clearly relevant; otherwise omit.
- 支払いサイト（日数）/出社頻度/稼働日数/面談回数/商流/商流制限/外国籍可否/PC貸与/精算幅: Extract when explicitly written. Keep concise (e.g., "45", "フルリモート", "週5日", "1", "元請→一次受け", "2次受けまで", "可/不可", "貸与あり", "140h〜180h").

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

function extractPCProvision(text?: string | null): string | undefined {
  if (!text) return;
  const t = toHalfWidth2(text);
  if (/PC[\s　]*貸与(?:有|あり|可)/i.test(t)) return "貸与あり";
  if (/(PC|端末)[\s　]*支給/i.test(t)) return "支給あり";
  if (/PC[\s　]*貸与(?:無|なし|不可)/i.test(t)) return "貸与なし";
  return;
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

// Normalize whitespace per line, preserving line breaks and removing empty lines.
function normalizeLinesKeepBreaks(s?: string | null) {
  if (!s) return undefined;
  const v = toHalfWidth2(s)
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((ln) => ln.replace(/^\s+|\s+$/g, ""))
    .filter((ln) => ln.length > 0)
    .join("\n")
    .trim();
  return v.length ? v : undefined;
}
function uniqStr(arr: (string|undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[]));
}
// Canonical tech keyword map (broad support + synonyms)
const LANG_CANON: Record<string, string> = {
  // Programming languages
  'js': 'JavaScript', 'javascript': 'JavaScript',
  'ts': 'TypeScript', 'typescript': 'TypeScript', 'タイプスクリプト': 'TypeScript',
  'java': 'Java', 'ジャバ': 'Java',
  'kotlin': 'Kotlin',
  'swift': 'Swift',
  'objective-c': 'Objective-C', 'objc': 'Objective-C', 'objective c': 'Objective-C',
  'c': 'C',
  'c++': 'C++', 'cpp': 'C++',
  'c#': 'C#', 'csharp': 'C#',
  'go': 'Go', 'golang': 'Go',
  'rust': 'Rust',
  'ruby': 'Ruby',
  'python': 'Python',
  'php': 'PHP',
  'scala': 'Scala',
  'r': 'R',
  'dart': 'Dart',
  'elixir': 'Elixir',
  'perl': 'Perl',
  'haskell': 'Haskell',
  'sql': 'SQL',
  'bash': 'Bash', 'shell': 'Bash', 'シェル': 'Bash',

  // Frontend frameworks & libs
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'vue': 'Vue', 'vuejs': 'Vue', 'vue.js': 'Vue',
  'angular': 'Angular', 'angularjs': 'Angular',
  'svelte': 'Svelte',
  'next': 'Next.js', 'nextjs': 'Next.js', 'next.js': 'Next.js',
  'nuxt': 'Nuxt.js', 'nuxtjs': 'Nuxt.js', 'nuxt.js': 'Nuxt.js',
  'jquery': 'jQuery', 'jquery.js': 'jQuery',

  // Backend & web frameworks
  'node': 'Node.js', 'nodejs': 'Node.js', 'node.js': 'Node.js',
  'express': 'Express',
  'nest': 'NestJS', 'nestjs': 'NestJS', 'nest.js': 'NestJS',
  'spring': 'Spring', 'springboot': 'Spring Boot', 'spring boot': 'Spring Boot',
  'rails': 'Ruby on Rails', 'ruby on rails': 'Ruby on Rails',
  'laravel': 'Laravel',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'asp.net': 'ASP.NET', 'aspnet': 'ASP.NET',
  'grpc': 'gRPC',
  'graphql': 'GraphQL',
  'rest': 'REST',

  // Mobile / cross-platform
  'android': 'Android',
  'ios': 'iOS',
  'swiftui': 'SwiftUI',
  'react native': 'React Native',
  'flutter': 'Flutter',

  // Databases & caches
  'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'sqlite': 'SQLite',
  'mariadb': 'MariaDB',
  'mongodb': 'MongoDB',
  'dynamodb': 'DynamoDB',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch', 'opensearch': 'OpenSearch',

  // Cloud & infra
  'aws': 'AWS',
  'gcp': 'Google Cloud', 'google cloud': 'Google Cloud',
  'azure': 'Azure',
  'docker': 'Docker',
  'k8s': 'Kubernetes', 'kubernetes': 'Kubernetes',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'pulumi': 'Pulumi',
  'helm': 'Helm',
  'serverless': 'Serverless',

  // Messaging / streaming
  'kafka': 'Kafka',
  'sqs': 'SQS', 'sns': 'SNS',
  'pubsub': 'Pub/Sub',

  // Tools & others
  'git': 'Git',
  'github actions': 'GitHub Actions',
  'circleci': 'CircleCI',
  'ga': 'Google Analytics',
  'bigquery': 'BigQuery',
};
const VALID_CANON = new Set(Object.values(LANG_CANON));

function canonLang(name: string) {
  if (!name) return '';
  const k = name
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[【】\[\]()（）]/g, '')
    .replace(/^[•・\-◆●,*]+/, '')
    .replace(/\.$/, '')
    .trim();
  return LANG_CANON[k] || '';
}

/**
 * Split a free-form list and keep only known tech keywords.
 * This prevents long Japanese sentences from being treated as skills,
 * while supporting a wide variety of technologies and synonyms.
 */
function explodeLangList(s?: string) {
  if (!s) return [] as string[];
  const parts = s
    .replace(/\r/g, '')
    // normalize separators: Japanese punctuation, commas, slashes, pipes, spaces
    .split(/[、，・;；,/／\|\n\t ]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(canonLang)
    .filter(Boolean)
    .filter((x) => VALID_CANON.has(x));
  // unique & stable order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) if (!seen.has(p)) { seen.add(p); out.push(p); }
  return out;
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
  // tolerant key-value: supports 【ラベル】 ：値 / ラベル: 値 / ラベル-値
  const kv = (label: string) => {
    const re = new RegExp(String.raw`[【\[]?${label}[】\]]?\s*[：:\-]\s*([^\n]+)`, "i");
    return clean2(t.match(re)?.[1]);
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
  const commerce = kv("商流");
  if (commerce) out.commerceTier = commerce;
  const commerceLimit = kv("商流制限");
  if (commerceLimit) out.commerceLimit = commerceLimit;

  // interview count
  {
    const ivRaw = kv("面談");
    if (ivRaw) {
      const miv = toHalfWidth2(ivRaw).match(/(\d+)\s*回?/);
      if (miv) out.interviewCount = Number(miv[1]);
    }
  }
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
        let m = src.match(new RegExp(String.raw`\b${H}\s*h\s*[~〜-]\s*${H}\s*h\b`, "i"));
        if (m && !looksLikeClock(m[0])) {
          out.paymentRange = `${m[1]}h〜${m[2]}h`;
        } else {
          // 2) Right side with 'h': "140〜180h" / "150-200h"
          m = src.match(new RegExp(String.raw`\b${H}\s*[~〜-]\s*${H}\s*h\b`, "i"));
          if (m && !looksLikeClock(m[0])) {
            out.paymentRange = `${m[1]}h〜${m[2]}h`;
          } else {
            // 3) Labelled form: "精算幅: 140h〜180h"
            const m2 = src.match(new RegExp(String.raw`精算(?:幅)?[:：]?\s*${H}\s*h?\s*[~〜-]\s*${H}\s*h\b`, "i"));
            if (m2 && !looksLikeClock(m2[0])) {
              out.paymentRange = `${m2[1]}h〜${m2[2]}h`;
            }
          }
        }
      }
    }
  // ----- SIMPLE FALLBACKS (robust against plain "見出し：本文" style) -----
  try {
    const tNL = t; // already normalized earlier

    // description / detailed (業務内容 or 案件詳細) fallback
    if (!(out as any).detailedDescription) {
      const mDescInline = tNL.match(/(?:^|\n)\s*(?:業務内容|仕事内容|職務内容|案件詳細)\s*[:：]\s*([^\n]+)/i);
      const mDescBlock = tNL.match(/(?:^|\n)\s*(?:業務内容|仕事内容|職務内容|案件詳細)\s*(?:[:：]|\n)\s*([\s\S]*?)(?=\n\s*[【\[]?\s*(?:募集背景|開発環境|使用技術|技術スタック|必須|尚可|歓迎|NG条件|勤務地|勤務時間|商流|精算|支払いサイト)\s*[】\]]?\s*(?:[:：]|\n)|\n*$)/i);
      const detailed = clean2((mDescBlock?.[1] || mDescInline?.[1]) ?? "");
      if (detailed) {
        (out as any).detailedDescription = detailed;
        const short = compactDescription(detailed);
        if (short && !(out as any).description) (out as any).description = short;
      }
    } else if (!(out as any).description) {
      const short = compactDescription(String((out as any).detailedDescription));
      if (short) (out as any).description = short;
    }

    // 必須/歓迎テキスト（原文） fallback
    if (!(out as any).mustSkillsText) {
      const mMust = tNL.match(/(?:^|\n)\s*(?:必須(?:条件|要件|スキル)?|応募要件|応募資格|求めるスキル)\s*(?:[:：]|\n)\s*([\s\S]*?)(?=\n\s*[【\[]?\s*(?:歓迎|尚可|尚良|NG条件|募集背景|業務内容|案件詳細|開発環境|使用技術)\s*[】\]]?\s*(?:[:：]|\n)|\n*$)/i);
      const mustTxt = normalizeLinesKeepBreaks(mMust?.[1] || "");
      if (mustTxt) (out as any).mustSkillsText = mustTxt.split("\n").map((ln) => ln.replace(/^[・•◆●\-\s]+/, "")).join("\n");
    }
    if (!(out as any).niceSkillsText) {
      const mNice = tNL.match(/(?:^|\n)\s*(?:歓迎(?:要件|スキル)?|尚可|尚良)\s*(?:[:：]|\n)\s*([\s\S]*?)(?=\n\s*[【\[]?\s*(?:必須|応募要件|応募資格|求めるスキル|NG条件|募集背景|業務内容|案件詳細|開発環境|使用技術)\s*[】\]]?\s*(?:[:：]|\n)|\n*$)/i);
      const niceTxt = normalizeLinesKeepBreaks(mNice?.[1] || "");
      if (niceTxt) (out as any).niceSkillsText = niceTxt.split("\n").map((ln) => ln.replace(/^[・•◆●\-\s]+/, "")).join("\n");
    }

    // 開発環境（environmentText） fallback: capture block between 開発環境 and next heading
    if (!(out as any).environmentText) {
      const mEnv = tNL.match(/(?:^|\n)\s*(?:開発環境|使用技術|技術スタック|利用技術|使用ツール|環境|Tech\s*Stack)\s*(?:[:：]|\n)\s*([\s\S]*?)(?=\n\s*[【\[]?\s*(?:必須|歓迎|尚可|尚良|NG条件|募集背景|業務内容|案件詳細|勤務地|勤務時間|商流|精算|支払いサイト)\s*[】\]]?\s*(?:[:：]|\n)|\n*$)/i);
      const envTxt = normalizeLinesKeepBreaks(mEnv?.[1] || "");
      if (envTxt) (out as any).environmentText = envTxt;
    }
  } catch { /* noop fallback errors */ }
  // payment range fallback from labeled line: 【精算幅】：140h-180h / 140-180h
  {
    const pr = kv("精算幅");
    if (pr && !out.paymentRange) {
      const s = toHalfWidth2(pr).replace(/\s+/g, "");
      const m = s.match(/(\d{2,3})\s*[~〜\-]\s*(\d{2,3})h?/i);
      if (m) out.paymentRange = `${m[1]}h〜${m[2]}h`;
    }
  }
  // payment term
  const pt = kv("支払いサイト") || pick(/(\d{2,3})\s*日サイト/i);
  if (pt) out.paymentTerms = pt;
  // normalize paymentTerms to pure number when possible
    if (out.paymentTerms) {
    const s = String(out.paymentTerms);
    const m = s.match(/(\d{1,3})/);
    if (m) out.paymentTerms = m[1];
    }
  // age limit
  const age = pick(/年齢[：:]\s*(\d{2})\s*歳?まで/i);
  if (age) out.ageLimit = Number(age);
  // foreigner acceptable
  if (/外国籍[：:]\s*(NG|不可|×)/i.test(t)) out.foreignerAcceptable = false;
  if (/外国籍[：:]\s*(OK|可|〇|○)/i.test(t)) out.foreignerAcceptable = true;
  // location label
  const loc = kv("勤務地") || (/(フルリモート|完全在宅)/i.test(t) ? "フルリモート" : undefined);
  if (loc) out.location = loc;
  const pc = extractPCProvision(t);
  if (pc) (out as any).pcProvision = pc;

  // --- 開発環境（environmentText） ---
  {
    // 見出しの同義語を広くカバー
    const heading = String.raw`(?:開発環境|使用技術|技術スタック|利用技術|使用ツール|環境|Tech\\s*Stack)`;
    const next = String.raw`(?:必須(?:条件|スキル)?|応募要件|応募資格|求めるスキル|歓迎(?:スキル)?|尚可|尚良|NG条件|募集背景|業務内容(?:（詳細）?)?|案件詳細|使用言語|開発言語|開発体制|勤務地|勤務時間|商流|精算(?:幅)?|支払いサイト)`;
    const envHeadingToNextRe = new RegExp(
      String.raw`^\\s*(?:[【\$begin:math:display$]?\\\\s*)?${heading}(?:\\\\s*[】\\$end:math:display$]\\s*)?\\s*(?:[:：])?\\s*[\\r\\n]+([\\s\\S]*?)(?=^\\s*(?:[【\$begin:math:display$]?\\\\s*${next}\\\\s*[】\\$end:math:display$]?\\s*(?:[:：])?\\s*$)|\\Z)`,
      "im"
    );
    const m = t.match(envHeadingToNextRe);
    if (m) {
      const filtered = (normalizeLinesKeepBreaks(m[1]) || "")
        .split("\n")
        // 見出し語だけの行は弾く
        .filter((ln) => !/^(?:[-・●◆]?\\s*)?(?:必須(?:条件|スキル)?|応募要件|応募資格|求めるスキル|歓迎(?:スキル)?|尚可|尚良)\\s*(?:[:：])?\\s*$/.test(ln))
        .join("\n")
        .trim();
      if (filtered) (out as any).environmentText = filtered;
    }
  }

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

  // --- 必須/歓迎テキスト原文の抽出（そのまま保存：改行保持） ---
  const stripPlaceholders = (s?: string) => {
    if (!s) return undefined;
    const lines = (normalizeLinesKeepBreaks(s) || "")
      .split("\n")
      .map((ln) => ln.replace(/^\s*[・•◆●\-]\s*/, "").trim())
      // 入力促し・説明文などのプレースホルダは除去
      .filter((ln) => !/(そのまま貼り付け|入力してください|記載してください|貼り付けて|ご入力|ペースト)/i.test(ln))
      .filter((ln) => ln.length > 0);
    const v = lines.join("\n").trim();
    return v.length ? v : undefined;
  };

  // 見出しのバリエーションを広くカバー
  const mustHead = String.raw`(?:必須(?:条件|スキル)?|応募要件|応募資格|求めるスキル|必須要件|必須経験)`;
  const niceHead = String.raw`(?:歓迎(?:スキル)?|歓迎要件|尚可|尚良|あると尚可|あると望ましい)`;
  const nextHead = String.raw`(?:${niceHead}|${mustHead}|NG条件|募集背景|業務内容(?:（詳細）?)?|案件詳細|開発環境|使用技術|技術スタック|使用言語|開発言語|勤務地|勤務時間|商流|精算(?:幅)?|支払いサイト|備考)`;

  const mustRe = new RegExp(String.raw`^[ \t]*?(?:[【\$begin:math:display$]?\s*)?${mustHead}(?:\s*[】\$end:math:display$]\s*)?\s*(?:[:：])?\s*[\r\n]+([\s\S]*?)(?=^\s*(?:[【\$begin:math:display$]?\s*${nextHead}\s*[】\$end:math:display$]?\s*(?:[:：])?\s*$)|\Z)`, "im");
  const niceRe = new RegExp(String.raw`^[ \t]*?(?:[【\$begin:math:display$]?\s*)?${niceHead}(?:\s*[】\$end:math:display$]\s*)?\s*(?:[:：])?\s*[\r\n]+([\s\S]*?)(?=^\s*(?:[【\$begin:math:display$]?\s*${nextHead}\s*[】\$end:math:display$]?\s*(?:[:：])?\s*$)|\Z)`, "im");

  const mustBlock = t.match(mustRe)?.[1];
  const niceBlockTxt = t.match(niceRe)?.[1];

  const mustNorm = stripPlaceholders(mustBlock);
  if (mustNorm) out.mustSkillsText = mustNorm;

  const niceNorm = stripPlaceholders(niceBlockTxt);
  if (niceNorm) out.niceSkillsText = niceNorm;

  // --- simple fallback for ＜必須＞ and ＜尚可＞ blocks (if not already set) ---
    if (!(out as any).mustSkillsText) {
    const m = t.match(/[<＜]\s*必須\s*[>＞]([\s\S]*?)(?=[<＜]\s*尚可\s*[>＞]|【|$)/i)?.[1];
    const txt = normalizeLinesKeepBreaks(m || "");
    if (txt) (out as any).mustSkillsText = txt
        .split("\n").map((ln) => ln.replace(/^[・•◆●\-\s]+/, "")).filter((ln)=>ln.length>0).join("\n");
    }
    if (!(out as any).niceSkillsText) {
    const m = t.match(/[<＜]\s*尚可\s*[>＞]([\s\S]*?)(?=【|$)/i)?.[1];
    const txt = normalizeLinesKeepBreaks(m || "");
    if (txt) (out as any).niceSkillsText = txt
        .split("\n").map((ln) => ln.replace(/^[・•◆●\-\s]+/, "")).filter((ln)=>ln.length>0).join("\n");
    }

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
  {
    const descHead = String.raw`(?:業務内容(?:（詳細）?)?|仕事内容|職務内容|業務概要|職務概要|案件詳細)`;
    const next = String.raw`(?:募集背景|開発環境|使用技術|技術スタック|${mustHead}|${niceHead}|NG条件|勤務地|勤務時間|商流|精算(?:幅)?|支払いサイト|応募方法|備考)`;
    const descRe = new RegExp(String.raw`^[ \\t]*?(?:[【\$begin:math:display$]?\\\\s*)?${descHead}(?:\\\\s*[】\\$end:math:display$]\\s*)?\\s*(?:[:：])?\\s*[\\r\\n]+([\\s\\S]*?)(?=^\\s*(?:[【\$begin:math:display$]?\\\\s*${next}\\\\s*[】\\$end:math:display$]?\\s*(?:[:：])?\\s*$)|\\Z)`, "im");
    const m = t.match(descRe)?.[1];
    if (m) {
      const detailed = normalizeLinesKeepBreaks(m);
      if (detailed) out.detailedDescription = detailed;
      const short = compactDescription(detailed || undefined);
      if (short) out.description = short;
    }
  }

  // recruitment background
  {
    const bgRe = /^(?:\\s*(?:[【\\[]?\\s*)?(?:募集背景|背景|ポジション背景)(?:\\s*[】\\]]\\s*)?\\s*(?:[:：])?\\s*[\\r\\n]+)([\\s\\S]*?)(?=^\\s*(?:[【\\[]?\\s*(?:${mustHead}|${niceHead}|NG条件|開発環境|使用技術|技術スタック|業務内容|案件詳細|勤務地|勤務時間)\\s*[】\\]]?\\s*(?:[:：])?\\s*$)|\\Z)/im;
    const m = t.match(bgRe)?.[1];
    const bg = normalizeLinesKeepBreaks(m || "");
    if (bg) out.recruitmentBackground = bg;
  }

  // NG条件（見出し～次見出しまで）
  {
    const ngRe = /^(?:\s*(?:[【\[]?\s*)?NG条件(?:\s*[】\]]\s*)?\s*(?:[:：])?\s*[\r\n]+)([\s\S]*?)(?=^\s*(?:[【\[]?\s*(?:${mustHead}|${niceHead}|募集背景|業務内容|案件詳細|開発環境|使用技術|技術スタック|勤務地|勤務時間)\s*[】\]]?\s*(?:[:：])?\s*$)|\Z)/im;
    const m = t.match(ngRe)?.[1];
    const ng = stripPlaceholders(m || "");
    if (ng) (out as any).ngConditions = ng;
  }
  // NG条件の単行パターンも拾う
  if (!(out as any).ngConditions) {
    const inline = t.match(/NG条件[：:\-]\s*([^\n]+)/i)?.[1];
    const v = normalizeLinesKeepBreaks(inline || "");
    if (v) (out as any).ngConditions = v;
  }

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
          mustSkillsText: { type: "string" },
          niceSkillsText: { type: "string" },
          environmentText: { type: "string" },
          ngConditions: { type: "string" },
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
          },
          attendanceFrequency: { type: "string" },
          interviewCount: { type: ["integer","number","string"] },
          paymentRange: { type: "string" },
          paymentTerms: { type: ["string","number"] },
          commerceTier: { type: "string" },
          commerceLimit: { type: "string" },
          ageLimit: { type: ["integer","number","string"] },
          foreignerAcceptable: { type: ["boolean","string"] },
          pcProvision: { type: "string" },
        }
      }
    };

    // ---- If no API key: heuristic-only path (dev-safe) --------------------
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

  // --- 日本語求人ヒューリスティクスで不足を補完 ---
  const fromJaNoAI = extractFromJapanesePosting(rawText);
  if (fromJaNoAI && Object.keys(fromJaNoAI).length) {
    Object.assign(result, mergeMissing(result, fromJaNoAI as Record<string, unknown>));
  }

  // detailedDescription しか無いときは短い description を作る
  if (!(result as any).description && (result as any).detailedDescription) {
    const short = compactDescription(String((result as any).detailedDescription));
    if (short) (result as any).description = short;
  }

  // ミラー/別名フィールドを整える
  const rAny: any = result;
  if (rAny.paymentSiteDays != null && rAny.paymentTerms == null) rAny.paymentTerms = String(rAny.paymentSiteDays);
  if (rAny.attendanceFrequency == null && rAny.attendance != null) rAny.attendanceFrequency = rAny.attendance;
  if (rAny.attendance == null && rAny.attendanceFrequency != null) rAny.attendance = rAny.attendanceFrequency;
  if (rAny.settlementRange != null && rAny.paymentRange == null) rAny.paymentRange = rAny.settlementRange;
  if (rAny.pcProvision != null && rAny.pcProvided == null) rAny.pcProvided = rAny.pcProvision;
  if (rAny.ngConditions == null && rAny.ngConditionsText != null) rAny.ngConditions = rAny.ngConditionsText;
  if (rAny.languageYears && !rAny.languageYearsText && typeof rAny.languageYears === 'object') {
    rAny.languageYearsText = Object.entries(rAny.languageYears as Record<string,string>)
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
    // Bidirectional sync for must/nice/ng raw text
    const mAny = parsed as any;
    if (mAny.mustSkillsText && !mAny.mustSkillsRaw) mAny.mustSkillsRaw = mAny.mustSkillsText;
    if (mAny.niceSkillsText && !mAny.niceSkillsRaw) mAny.niceSkillsRaw = mAny.niceSkillsText;
    if (mAny.ngConditions && !mAny.ngConditionsText) mAny.ngConditionsText = mAny.ngConditions;
    if (mAny.ngConditionsText && !mAny.ngConditions) mAny.ngConditions = mAny.ngConditionsText;