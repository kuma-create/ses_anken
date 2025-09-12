
// -------------------- Normalization Utilities --------------------
function toHalfWidth(input: string) {
  // Convert full-width alphanumerics and punctuation to half-width
  return input
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

function cleanStr(s?: string | null) {
  if (!s) return undefined;
  const v = toHalfWidth(s).replace(/[\t\r]+/g, " ").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  return v.length ? v : undefined;
}

function parseNumberLike(text?: string): number | undefined {
  if (!text) return undefined;
  const t = toHalfWidth(text).replace(/,/g, "");
  // 例: 800000円 → 80（万円）
  const yen = t.match(/(\d+(?:\.\d+)?)\s*円/);
  if (yen) {
    const n = parseFloat(yen[1]);
    if (!isNaN(n)) return Math.round(n / 10000);
  }
  // 例: 80万, 80.5万 → 80 or 80.5（万円）
  const man = t.match(/(\d+(?:\.\d+)?)\s*万/);
  if (man) {
    const n = parseFloat(man[1]);
    if (!isNaN(n)) return n;
  }
  // 純粋な数値 → 万円と仮定（求人票では多い）
  const plain = t.match(/(\d+(?:\.\d+)?)/);
  if (plain) {
    const n = parseFloat(plain[1]);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

function extractRange(text: string): { min?: number; max?: number } {
  const t = toHalfWidth(text);
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:万|万円|)\s*[\-~〜]\s*(\d+(?:\.\d+)?)\s*(?:万|万円|)/i);
  if (m) {
    const min = parseFloat(m[1]);
    const max = parseFloat(m[2]);
    return { min, max };
  }
  // Fallback for things like "800,000円~1,100,000円"
  const y = t.match(/(\d[\d,]*)\s*円\s*[\-~〜]\s*(\d[\d,]*)\s*円/);
  if (y) {
    const min = Math.round(parseInt(y[1].replace(/,/g, ""), 10) / 10000);
    const max = Math.round(parseInt(y[2].replace(/,/g, ""), 10) / 10000);
    return { min, max };
  }
  return {};
}

function splitSkills(block?: string): string[] | undefined {
  if (!block) return undefined;
  const items = block
    .split(/[、・,;／/\n\u30fb\u2022\u25CF\u25A0\u25AA\u00B7]/)
    .map((s) => cleanStr(s?.replace(/^[-‐–—・・●◆■◇▶︎>\s]+/, "")))
    .filter(Boolean) as string[];
  // 短く正規化（括弧内削除など）
  const normalized = items
    .map((s) => s.replace(/[（(].*?[)）]/g, "").trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(normalized));
}

function detectWorkStyle(text: string): "remote" | "onsite" | "hybrid" | "" {
  const t = toHalfWidth(text);
  if (/(フルリモート|完全在宅|在宅のみ|remote)/i.test(t)) return "remote";
  if (/(ハイブリッド|一部在宅|週\d回出社|hybrid)/i.test(t)) return "hybrid";
  if (/(常駐|オンサイト|出社|onsite)/i.test(t)) return "onsite";
  return "";
}

function coerceBooleanJa(text?: string): boolean | undefined {
  if (!text) return undefined;
  const t = toHalfWidth(text);
  if (/(あり|有|可|可能|貸与|支給|yes|true)/i.test(t)) return true;
  if (/(なし|無|不可|不可|持参|no|false)/i.test(t)) return false;
  return undefined;
}

// -------------------- Post-Parse Helpers --------------------
function trimLeadingLabel(s?: string) {
  if (!s) return s;
  return s.replace(/^[\s:：\]】＞>\-・]+/, "");
}

function summarizeDescription(raw?: string, maxLen = 120) {
  if (!raw) return raw;
  const t = toHalfWidth(raw)
    .replace(/[\r\t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // 箇条書き優先で先頭3項目を抽出
  const bullets = raw
    .split(/[\n\r]+/)
    .flatMap((l) => l.split(/[・\u30fb\u2022\-–—◆■▶︎>]/))
    .map((s) => cleanStr(s))
    .filter(Boolean) as string[];
  const joined = (bullets.length ? bullets.slice(0, 3) : [t]).join(" / ");
  return joined.length > maxLen ? joined.slice(0, maxLen - 1) + "…" : joined;
}

// --------------- Section Pickers (Japanese headings tolerant) ---------------
const SECTION_LABELS = {
  desc: ["案件詳細", "概要", "説明", "詳細", "プロジェクト概要"],
  work: ["業務内容", "仕事内容", "職務内容", "作業内容", "担当業務"],
  background: ["募集背景", "募集理由", "背景"],
  env: ["開発環境", "使用技術", "技術スタック", "環境", "ツール", "言語"],
  ng: ["NG条件", "応募NG", "不可", "禁止"]
} as const;

function headingPattern(labels: readonly string[]) {
  // 行頭マーカー（■◆●*・-）や【】[] のあり/なし、コロンのあり/なしを許容
  const l = labels.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(
    String.raw`(?:^|\n)[\t ]*[【\[]?[■◆●*・\-]?\s*(?:${l})[】\]]?\s*(?:[:：]\s*|\n)`,
    "i"
  );
}

function pickSectionFlexible(text: string, labels: readonly string[]): string | undefined {
  const t = toHalfWidth(text);
  // 1) インライン: 「見出し：本文」同一行
  const inline = new RegExp(
    String.raw`(?:^|\n)[\t ]*[【\[]?[■◆●*・\-]?\s*(?:${labels.map((s)=>s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})[】\]]?\s*[:：]\s*([^\n]+)`,
    "i"
  );
  const m1 = t.match(inline);
  if (m1) return trimLeadingLabel(cleanStr(m1[1]) || "");

  // 2) ブロック: 見出し行の次の行から次の見出しまで
  const allHeads = [
    ...SECTION_LABELS.desc,
    ...SECTION_LABELS.work,
    ...SECTION_LABELS.background,
    ...SECTION_LABELS.env,
    ...SECTION_LABELS.ng,
  ];
  const head = headingPattern(labels);
  const nextHead = headingPattern(allHeads);
  const start = t.search(head);
  if (start >= 0) {
    const rest = t.slice(start);
    // 先頭見出しの行末以降を抽出
    const after = rest.replace(/^.*?(?:\n|$)/, "");
    const endIdx = after.search(nextHead);
    const body = endIdx >= 0 ? after.slice(0, endIdx) : after;
    const lines = body.split(/\r?\n/).map((s) => trimLeadingLabel(cleanStr(s) || ""));
    const cleaned = lines.filter((s) => s && s.length > 0).join("\n");
    return cleaned || undefined;
  }
  return undefined;
}

// --------------- Language extraction ---------------
const LANG_ALIASES: Record<string, string> = {
  'javascript': 'JavaScript', 'js': 'JavaScript', 'node.js': 'JavaScript', 'node': 'JavaScript',
  'typescript': 'TypeScript', 'ts': 'TypeScript',
  'python': 'Python', 'py': 'Python',
  'java': 'Java',
  'kotlin': 'Kotlin',
  'scala': 'Scala',
  'c#': 'C#', 'csharp': 'C#',
  'go': 'Go', 'golang': 'Go',
  'rust': 'Rust',
  'php': 'PHP',
  'ruby': 'Ruby',
  'swift': 'Swift',
  'dart': 'Dart',
  'objective-c': 'Objective-C', 'objc': 'Objective-C'
};

function extractLanguagesAndYears(text: string): string | undefined {
  const tOrig = toHalfWidth(text);
  const t = tOrig.toLowerCase();

  // 言語の正規化
  const aliasToCanon = (raw: string) => {
    const k = raw.toLowerCase().trim();
    return LANG_ALIASES[k] || raw.trim();
  };

  // 候補を { canon -> bestString } で保持（年数付きがあれば優先）
  const found = new Map<string, string>();

  // 1) セグメントベース（カンマ/改行/中点/スラッシュ）
  const segments = t.split(/[\n,、・/／;]+/);
  for (const segRaw of segments) {
    const seg = segRaw.trim();
    if (!seg) continue;

    for (const key in LANG_ALIASES) {
      if (seg.includes(key)) {
        const canon = LANG_ALIASES[key];

        // パターン: 言語の後に年数
        // 例: "java 3年", "java 2.5年 以上", "java：3年", "java(3年)", "java yrs 3", "java 3 years"
        let years = '';
        const m1 =
          seg.match(/(?:^|\s|：|\:|\(|（)\s*(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?(?=\s*[\)）]|\s|$)/i) ||
          seg.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?(?:\s*経験)?/i);
        const m1b =
          seg.match(/(?:^|[\s：:（(])\s*(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?(?=[\s）)]|$)/i);
        const m1c =
          seg.match(/(?:経験|exp)[^\d]{0,4}(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?/i);

        const mLangAfter =
          seg.match(/(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?\s*(?:の)?\s*(javascript|node\.?js?|typescript|python|java|kotlin|scala|c#|csharp|go|golang|rust|php|ruby|swift|dart|objective\-c|objc)(?=\s|,|、|・|\)|）|$)/i);

        if (m1 || m1b || m1c) {
          const g = m1 || m1b || m1c;
          years = `${g[1]}年${g[2] ? '以上' : ''}`;
        } else if (mLangAfter) {
          const yrs = `${mLangAfter[1]}年${mLangAfter[2] ? '以上' : ''}`;
          const langCanon = aliasToCanon(mLangAfter[3]);
          // 先に言語を上書き
          const prev = found.get(langCanon);
          const val = `${langCanon} ${yrs}`;
          if (!prev || !/年/.test(prev)) found.set(langCanon, val);
          continue;
        }

        // 言語単独 or 年数付き
        const prev = found.get(canon);
        const val = years ? `${canon} ${years}` : canon;
        if (!prev) {
          found.set(canon, val);
        } else {
          // 既存が年数なしで、今回が年数ありなら上書き
          if (!/年/.test(prev) && /年/.test(val)) found.set(canon, val);
        }
      }
    }
  }

  // 2) 行全体からの網羅的パターン（順不同）
  // 例: "Java：3年", "Java(3年)", "Java 経験 3年", "3年のJava", "3 years of Java"
  const patterns: RegExp[] = [
    /(?:^|\s|,|、|・|\(|（)(javascript|node\.?js?|typescript|python|java|kotlin|scala|c#|csharp|go|golang|rust|php|ruby|swift|dart|objective\-c|objc)\s*(?:：|:|\(|（)?\s*(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?/gi,
    /(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?\s*(?:の)?\s*(javascript|node\.?js?|typescript|python|java|kotlin|scala|c#|csharp|go|golang|rust|php|ruby|swift|dart|objective\-c|objc)/gi,
    /(javascript|node\.?js?|typescript|python|java|kotlin|scala|c#|csharp|go|golang|rust|php|ruby|swift|dart|objective\-c|objc)\s*(?:経験|exp)\s*(\d+(?:\.\d+)?)\s*(?:年|yrs?|years?)(以上)?/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const t2 = tOrig; // 大文字小文字を保持した原文で抽出（表記を綺麗に）
    while ((m = re.exec(t2)) !== null) {
      const g1 = m[1];
      const g2 = m[2];
      const g3 = m[3];
      let name = '';
      let years = '';
      if (re === patterns[1]) {
        // years-first
        const lang = m[3];
        name = aliasToCanon(lang);
        years = `${g1}年${g2 ? '以上' : ''}`;
      } else {
        // lang-first
        name = aliasToCanon(g1);
        years = `${g2}年${g3 ? '以上' : ''}`;
      }
      const prev = found.get(name);
      const val = `${name} ${years}`;
      if (!prev || !/年/.test(prev)) found.set(name, val);
    }
  }

  if (found.size === 0) {
    // 年数は取れなくても、言語名だけは返す（後工程で補完）
    const langs = Array.from(
      new Set(Object.keys(LANG_ALIASES).filter(k => t.includes(k)).map(k => LANG_ALIASES[k]))
    );
    return langs.length ? langs.join(', ') : undefined;
  }
  return Array.from(found.values()).join(', ');
}

// ---- Language helpers for UI normalization/preview ----
function namesFromYearsList(list?: string) {
  if (!list) return '';
  const onlyNames = list
    .replace(/\s*\d+(?:\.\d+)?\s*年(?:以上)?/gi, '') // "3年", "2.5年", "3年以上" を削除
    .replace(/\s{2,}/g, ' ')
    .trim();
  const arr = onlyNames
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(arr)).join(', ');
}

function normalizeYearsList(list?: string) {
  if (!list) return '';
  return list
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    // "Java3年" → "Java 3年" のように空白を整える
    .map((s) =>
      s.replace(
        /(\S)\s*(\d+(?:\.\d+)?)\s*年(以上)?/i,
        (_m, a, n, plus) => `${a} ${n}年${plus ? '以上' : ''}`
      )
    )
    .join(', ');
}

function splitYearsToBadges(list?: string) {
  if (!list) return [];
  return list
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pairsFromYearsList(list?: string) {
  if (!list) return [] as { name: string; years: string }[];
  return list
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      // 例: "Java 3年", "Python 2年以上", "Go"
      const m = item.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*年(以上)?$/i);
      if (m) {
        const name = m[1].trim();
        const years = `${m[2]}年${m[3] ? "以上" : ""}`;
        return { name, years };
      }
      return { name: item, years: "" };
    });
}

function joinPairsToYearsList(pairs: { name: string; years: string }[]) {
  return pairs
    .map((p) => [p.name?.trim(), p.years?.trim()].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");
}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon, X, Plus, FileUp } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { SectionHeader } from "./SectionHeader"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { Project, WorkStyle } from "../lib/types"
import { PdfUploader } from "./PdfUploader"
import { Separator } from "./ui/separator"
import { pdfApi } from "../lib/pdf-api"
import { supabase } from "../utils/supabase/client";

interface ProjectFormProps {
  projectId?: string
}

export function ProjectForm({ projectId }: ProjectFormProps) {
  const { projects: projectsFromStore, addProject, updateProject } = useAppStore()
  const projects = Array.isArray(projectsFromStore) ? projectsFromStore : []
  const { navigate } = useRouter()
  
  const existingProject = projectId ? projects.find(p => p.id === projectId) : null
  const isEditing = !!projectId && !!existingProject

  if (projectId && projects.length === 0) {
    // store未初期化の瞬間に find を走らせない（HMR直後など）
    return (
      <div className="space-y-6">
        <SectionHeader
          title="読み込み中"
          description="案件情報を読み込んでいます…"
        >
          <Button variant="outline" onClick={() => navigate('/projects')}>
            戻る
          </Button>
        </SectionHeader>
      </div>
    )
  }

  // If projectId is provided but project not found, show error
  if (projectId && !existingProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="エラー"
          description="指定された案件が見つかりません"
        >
          <Button variant="outline" onClick={() => navigate('/projects')}>
            戻る
          </Button>
        </SectionHeader>
      </div>
    )
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailedDescription: '',
    recruitmentBackground: '',
    mustSkills: [] as string[],
    niceSkills: [] as string[],
    mustSkillsText: '',
    niceSkillsText: '',
    budgetMin: '',
    budgetMax: '',
    workStyle: '' as WorkStyle | '',
    startDate: undefined as Date | undefined,
    language: '',
    languageYears: '',
    languages: [] as { name: string; years: string }[],
    commerceTier: '',
    commerceLimit: '',
    location: '',
    workingHours: '',
    workingDays: '',
    attendanceFrequency: '',
    interviewCount: '',
    paymentRange: '',
    pcProvided: '',
    paymentTerms: '',
    ageLimit: '',
    foreignerAcceptable: '',
    ngConditions: '',
    developmentEnvironment: ''
  })

  const [skillInput, setSkillInput] = useState('')
  const [niceSkillInput, setNiceSkillInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPdfUploader, setShowPdfUploader] = useState(false)
  const [manualText, setManualText] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  // AI補完: 空欄のみ自信ありで補完
  const [aiAutofill, setAiAutofill] = useState(true)

  // 表示整形: 精算幅 "140h〜180h" へ正規化

  // --- AI正規化データ反映ユーティリティ（コンポーネント内に移動） ---
const applyAiNormalizedData = (data: any) => {
  try {
    const d: any =
      data && typeof data === "object"
        ? Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ""))
        : {};

    const workStyleMap: { [key: string]: WorkStyle } = {
      'リモート': 'remote',
      'remote': 'remote',
      '完全在宅': 'remote',
      '在宅': 'remote',
      'オンサイト': 'onsite',
      '常駐': 'onsite',
      'onsite': 'onsite',
      'ハイブリッド': 'hybrid',
      '一部在宅': 'hybrid',
      'hybrid': 'hybrid',
    };
    const mapWorkStyle = (val?: string, prev: typeof formData) => {
      if (!val) return prev.workStyle;
      const key = toHalfWidth(String(val)).toLowerCase();
      if (workStyleMap[val as keyof typeof workStyleMap]) return workStyleMap[val as keyof typeof workStyleMap];
      if (key.includes('remote') || key.includes('在宅')) return 'remote';
      if (key.includes('hybrid') || key.includes('一部')) return 'hybrid';
      if (key.includes('onsite') || key.includes('常駐') || key.includes('出社')) return 'onsite';
      return prev.workStyle;
    };

    setFormData(prev => {
      const base = {
        ...prev,
        title: d.title ?? prev.title,
        description: d.description ?? prev.description,
        detailedDescription: d.detailedDescription ?? prev.detailedDescription,
        recruitmentBackground: d.recruitmentBackground ?? prev.recruitmentBackground,
        mustSkills: Array.isArray(d.mustSkills) && d.mustSkills.length
          ? [...new Set([...(prev.mustSkills ?? []), ...d.mustSkills])]
          : prev.mustSkills,
        niceSkills: Array.isArray(d.niceSkills) && d.niceSkills.length
          ? [...new Set([...(prev.niceSkills ?? []), ...d.niceSkills])]
          : prev.niceSkills,
        mustSkillsText: d.mustSkillsText ?? prev.mustSkillsText,
        niceSkillsText: d.niceSkillsText ?? prev.niceSkillsText,
        budgetMin: (d.budgetMin != null) ? String(d.budgetMin) : prev.budgetMin,
        budgetMax: (d.budgetMax != null) ? String(d.budgetMax) : prev.budgetMax,
        workStyle: d.workStyle ? mapWorkStyle(d.workStyle, prev) : prev.workStyle,
        startDate: d.startDate
          ? (() => {
              const date = new Date(d.startDate);
              return isNaN(date.getTime()) ? prev.startDate : date;
            })()
          : prev.startDate,
        language: d.language ?? prev.language,
        languageYears: d.languageYearsText ?? d.languageYears ?? prev.languageYears,
        languages:
          (d.languageYearsText || d.languageYears)
            ? pairsFromYearsList(normalizeYearsList(d.languageYearsText || d.languageYears))
            : (prev.languages && prev.languages.length
                ? prev.languages
                : pairsFromYearsList(normalizeYearsList(prev.languageYears || d.language || prev.language || ""))),
        commerceTier: d.commerceTier ?? prev.commerceTier,
        commerceLimit: d.commerceLimit ?? prev.commerceLimit,
        location: d.location ? trimLeadingLabel(d.location) : prev.location,
        workingHours: d.workingHours ? trimLeadingLabel(d.workingHours) : prev.workingHours,
        workingDays: d.workingDays ?? prev.workingDays,
        attendanceFrequency: d.attendanceFrequency ? trimLeadingLabel(d.attendanceFrequency) : prev.attendanceFrequency,
        interviewCount: (d.interviewCount != null) ? String(d.interviewCount) : prev.interviewCount,
        paymentRange: d.paymentRange ?? prev.paymentRange,
        pcProvided: (d.pcProvided != null) ? String(d.pcProvided) : prev.pcProvided,
        paymentTerms: d.paymentTerms ?? prev.paymentTerms,
        ageLimit: (d.ageLimit != null) ? String(d.ageLimit) : prev.ageLimit,
        foreignerAcceptable: (d.foreignerAcceptable != null) ? String(d.foreignerAcceptable) : prev.foreignerAcceptable,
        ngConditions: d.ngConditions ?? prev.ngConditions,
        developmentEnvironment:
          (d.developmentEnvironment && String(d.developmentEnvironment).trim() !== "")
            ? d.developmentEnvironment
            : (() => {
                const mustTxt = (d as any).mustSkillsText as string | undefined;
                const niceTxt = (d as any).niceSkillsText as string | undefined;
                if ((prev.developmentEnvironment && String(prev.developmentEnvironment).trim() !== "") || (!mustTxt && !niceTxt)) {
                  return prev.developmentEnvironment;
                }
                const lines = [
                  mustTxt ? `必須: ${mustTxt}` : "",
                  niceTxt ? `歓迎: ${niceTxt}` : ""
                ].filter(Boolean);
                return lines.length ? lines.join("\n") : prev.developmentEnvironment;
              })()
      } as typeof prev;

      if (!base.language && base.languageYears) {
        base.language = base.languageYears
          .replace(/\s*\d+(?:\.\d+)?\s*年(?:以上)?/g, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s+,/g, ', ')
          .trim();
      }

      return aiAutofill ? mergeEmptyWithConfidence(base, d) : base;
    });
  } catch (e) {
    console.error('AI正規化データの反映でエラー:', e);
  }
};

  useEffect(() => {
    const names = namesFromYearsList(formData.languageYears);
    if (names && names !== formData.language) {
      setFormData((prev) => ({ ...prev, language: names }));
    }
    // languages が未設定の場合は languageYears から初期化
    if ((!formData.languages || formData.languages.length === 0) && formData.languageYears) {
      const pairs = pairsFromYearsList(normalizeYearsList(formData.languageYears));
      if (pairs.length) {
        setFormData((prev) => ({ ...prev, languages: pairs }));
      }
    }
  }, [formData.languageYears]);

  useEffect(() => {
    // languages から languageYears / language を同期（表示・保存互換のため）
    if (formData.languages) {
      const ly = joinPairsToYearsList(formData.languages);
      const namesOnly = formData.languages.map((p) => p.name).filter(Boolean).join(", ");
      setFormData((prev) => ({
        ...prev,
        languageYears: ly,
        language: namesOnly
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData.languages)]);

  // LLM正規化API呼び出し
async function normalizeWithLLM(parsedData: any) {
    try {
      const payload = {
        instruction: `以下の求人票データを正規化し、可能であれば欠損フィールドのみを推測補完してください。
   - 出力は JSON のみ。
   - 事実に自信がない場合はフィールドを出力しない（空文字や '不明' は入れない）。
   - 数値は半角で、金額は万円基準。
   - 勤務形態は remote/onsite/hybrid のいずれか。
   - description は120字以内で要約。
   - 可能なら _confidence を { フィールド名: 0.0〜1.0 } で付与。0.6未満は出力しない。
   - 可能なら languageYears（"JavaScript 3年, Java 2年以上" のような書式）も返す。`,
        data: parsedData,
        rawText: typeof manualText === "string" ? manualText : undefined,
      };

      // Use Supabase Edge Function invoke to avoid localhost 404 and forward auth automatically
      const { data, error } = await supabase.functions.invoke("llm-normalize", {
        body: payload,
      });

      if (error) {
        console.error("LLM正規化APIエラー:", error);
        return parsedData;
      }

      if (data && typeof data === "object") {
        return data as any;
      }

      console.warn("LLM正規化APIが不正なレスポンスを返しました。受信内容:", data);
      return parsedData;
    } catch (err) {
      console.error("LLM正規化API呼び出し失敗:", err);
      return parsedData;
    }
  }

  // AI補完: 空欄のみ自信ありでマージ
  function mergeEmptyWithConfidence(prev: typeof formData, ai: any) {
    const c: Record<string, number> = ai?._confidence || {};
    const th = 0.6;
    const take = (k: keyof typeof formData, v: any) => {
      if (v == null) return prev[k];
      const conf = typeof c[k as string] === 'number' ? c[k as string] : 1;
      const isEmpty = (x: any) => x == null || (typeof x === 'string' && x.trim() === '');
      return conf >= th && isEmpty(prev[k]) ? v : prev[k];
    };
    return {
      ...prev,
      title: take('title', ai.title),
      description: take('description', ai.description),
      detailedDescription: take('detailedDescription', ai.detailedDescription),
      recruitmentBackground: take('recruitmentBackground', ai.recruitmentBackground),
      mustSkills: Array.isArray(ai.mustSkills) && (!prev.mustSkills?.length)
        ? Array.from(new Set(ai.mustSkills)) : prev.mustSkills,
      niceSkills: Array.isArray(ai.niceSkills) && (!prev.niceSkills?.length)
        ? Array.from(new Set(ai.niceSkills)) : prev.niceSkills,
      mustSkillsText: take('mustSkillsText', ai.mustSkillsText),
      niceSkillsText: take('niceSkillsText', ai.niceSkillsText),
      budgetMin: take('budgetMin', ai.budgetMin != null ? String(ai.budgetMin) : undefined),
      budgetMax: take('budgetMax', ai.budgetMax != null ? String(ai.budgetMax) : undefined),
      workStyle: take('workStyle', ai.workStyle),
      startDate: prev.startDate, // 日付は上書きしない
      language: take('language', ai.language),
      languageYears: take('languageYears', ai.languageYears),
      commerceTier: take('commerceTier', ai.commerceTier),
      commerceLimit: take('commerceLimit', ai.commerceLimit),
      location: take('location', ai.location),
      workingHours: take('workingHours', ai.workingHours),
      workingDays: take('workingDays', ai.workingDays),
      attendanceFrequency: take('attendanceFrequency', ai.attendanceFrequency),
      interviewCount: take('interviewCount', ai.interviewCount != null ? String(ai.interviewCount) : undefined),
      paymentRange: take('paymentRange', ai.paymentRange),
      pcProvided: take('pcProvided', ai.pcProvided != null ? String(ai.pcProvided) : undefined),
      paymentTerms: take('paymentTerms', ai.paymentTerms),
      ageLimit: take('ageLimit', ai.ageLimit != null ? String(ai.ageLimit) : undefined),
      foreignerAcceptable: take('foreignerAcceptable', ai.foreignerAcceptable != null ? String(ai.foreignerAcceptable) : undefined),
      ngConditions: take('ngConditions', ai.ngConditions),
      developmentEnvironment: take('developmentEnvironment', ai.developmentEnvironment),
    } as typeof formData;
  }

  const handleManualTextFill = async () => {
    if (!manualText.trim()) {
      alert("自動入力用のテキストを貼り付けてください");
      return;
    }
    try {
      setIsParsing(true);
      // Pass empty parsedData; let the Edge Function parse rawText and return normalized fields
      const normalized = await normalizeWithLLM({});
      applyAiNormalizedData(normalized);
    } catch (e) {
      console.error("テキストからの自動入力(LLM)に失敗:", e);
      alert("AI正規化に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsParsing(false);
    }
  };

  useEffect(() => {
    if (existingProject && existingProject.title) {
      setFormData({
        title: existingProject.title || '',
        description: existingProject.description || '',
        detailedDescription: existingProject.detailedDescription || '',
        recruitmentBackground: existingProject.recruitmentBackground || '',
        mustSkills: existingProject.mustSkills || [],
        niceSkills: existingProject.niceSkills || [],
        mustSkillsText: (existingProject as any).mustSkillsText || '',
        niceSkillsText: (existingProject as any).niceSkillsText || '',
        budgetMin: existingProject.budgetMin != null ? String(existingProject.budgetMin) : '',
        budgetMax: existingProject.budgetMax != null ? String(existingProject.budgetMax) : '',
        workStyle: existingProject.workStyle || '',
        startDate: existingProject.startDate ? (() => {
          const date = new Date(existingProject.startDate)
          return isNaN(date.getTime()) ? undefined : date
        })() : undefined,
        language: existingProject.language || '',
        languageYears: (existingProject as any).languageYears || existingProject.language || '',
        languages: pairsFromYearsList(
          normalizeYearsList((existingProject as any).languageYears || existingProject.language || '')
        ),
        commerceTier: existingProject.commerceTier || '',
        commerceLimit: existingProject.commerceLimit || '',
        location: existingProject.location || '',
        workingHours: existingProject.workingHours || '',
        workingDays: existingProject.workingDays || '',
        attendanceFrequency: existingProject.attendanceFrequency || '',
        interviewCount: existingProject.interviewCount != null ? String(existingProject.interviewCount) : '',
        paymentRange: existingProject.paymentRange || '',
        pcProvided: existingProject.pcProvided === true ? 'true' : existingProject.pcProvided === false ? 'false' : '',
        paymentTerms: existingProject.paymentTerms || '',
        ageLimit: existingProject.ageLimit != null ? String(existingProject.ageLimit) : '',
        foreignerAcceptable: existingProject.foreignerAcceptable === true ? 'true' : existingProject.foreignerAcceptable === false ? 'false' : '',
        ngConditions: existingProject.ngConditions || '',
        developmentEnvironment: existingProject.developmentEnvironment || ''
      })
    }
  }, [existingProject])

  const addSkill = (skill: string, type: 'must' | 'nice') => {
    const trimmedSkill = skill.trim()
    if (!trimmedSkill) return

    if (type === 'must') {
      if (!formData.mustSkills.includes(trimmedSkill)) {
        setFormData(prev => ({
          ...prev,
          mustSkills: [...prev.mustSkills, trimmedSkill]
        }))
      }
      setSkillInput('')
    } else {
      if (!formData.niceSkills.includes(trimmedSkill)) {
        setFormData(prev => ({
          ...prev,
          niceSkills: [...prev.niceSkills, trimmedSkill]
        }))
      }
      setNiceSkillInput('')
    }
  }

  const removeSkill = (skill: string, type: 'must' | 'nice') => {
    if (type === 'must') {
      setFormData(prev => ({
        ...prev,
        mustSkills: prev.mustSkills.filter(s => s !== skill)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        niceSkills: prev.niceSkills.filter(s => s !== skill)
      }))
    }
  }

  // 手貼りテキスト用のより堅牢なパーサ
  function parseProjectText(text: string) {
    const t = toHalfWidth(text);
    const clean = (s?: string | null) => cleanStr(s);
    const pick = (re: RegExp, idx = 1) => {
      const m = t.match(re);
      return m ? clean(m[idx]) : undefined;
    };

    const firstLine = clean(
      (t.split(/\r?\n/).find((l) => clean(l)) || "").replace(/^【?案件名】?|^【?タイトル】?/g, "")
    );

    // --- 予算抽出を強化（文脈を限定し、時間表記などの誤爆を避ける） ---
    function budgetFromContext(src: string): { min?: number; max?: number } {
      const ctxLines = src.split(/\r?\n/);
      const budgetLines = ctxLines.filter((l) => /予算|単価|月単価|報酬/i.test(l));
      const ctx = toHalfWidth((budgetLines.join(" ") || src).slice(0, 300));

      // パターン1: 80〜120万 / 80-120万円
      const r1 = ctx.match(/(\d+(?:\.\d+)?)\s*(?:万|万円)\s*[~〜\-]\s*(\d+(?:\.\d+)?)\s*(?:万|万円)/i);
      if (r1) return { min: parseFloat(r1[1]), max: parseFloat(r1[2]) };
      // パターン2: 800,000円〜1,100,000円
      const r2 = ctx.match(/(\d[\d,]*)\s*円\s*[~〜\-]\s*(\d[\d,]*)\s*円/i);
      if (r2) return { min: Math.round(parseInt(r2[1].replace(/,/g, ""), 10) / 10000), max: Math.round(parseInt(r2[2].replace(/,/g, ""), 10) / 10000) };
      // パターン3: 〜17万（下限省略）
      const r3 = ctx.match(/[~〜\-]\s*(\d+(?:\.\d+)?)\s*(?:万|万円)/);
      if (r3) return { max: parseFloat(r3[1]) };
      // パターン4: 17万（単発記載） or 800,000円
      const r4 = ctx.match(/(\d+(?:\.\d+)?)\s*(?:万|万円)/);
      if (r4) return { min: parseFloat(r4[1]) };
      const r5 = ctx.match(/(\d[\d,]*)\s*円/);
      if (r5) return { min: Math.round(parseInt(r5[1].replace(/,/g, ""), 10) / 10000) };
      return {};
    }

    let budgetMin: number | undefined;
    let budgetMax: number | undefined;
    const br = budgetFromContext(t);
    budgetMin = br.min;
    budgetMax = br.max;
    // 0 は未設定扱いにする（時間等の誤爆防止）
    if (budgetMin === 0) budgetMin = undefined;
    if (budgetMax === 0) budgetMax = undefined;

    // 精算幅 抽出を「精算」周辺に限定し、時間表記(10:00〜17:00)を誤認しない
    let paymentRange: string | undefined;
    {
      // 「精算」を含む行のみを対象にし、なければ抽出しない（誤爆防止）
      const lines = t.split(/\r?\n/);
      const ctxLines = lines.filter((l) => /精算/.test(l));
      if (ctxLines.length > 0) {
        const src = toHalfWidth(ctxLines.join(" "));

        // "10:00〜17:00" のような時計表記は除外
        const looksLikeClock = (s: string) =>
          /(?:^|\s)[0-2]?\d:\d{2}\s*[~〜\-]\s*[0-2]?\d:\d{2}(?:\s|$)/.test(s);

        // 月間稼働時間として現実的な範囲（80〜259h）に限定
        const H = String.raw`(8\d|9\d|1\d{2}|2[0-5]\d)`;

        // 1) 左右とも h の明示: "140h〜180h" / "140h-180h"
        let m = src.match(new RegExp(String.raw`\b${H}\s*h\s*[~〜\-]\s*${H}\s*h\b`, "i"));
        if (m && !looksLikeClock(m[0])) {
          paymentRange = `${m[1]}h-${m[2]}h`;
        } else {
          // 2) 右側のみ h を伴う: "140〜180h" / "150-200h"
          m = src.match(new RegExp(String.raw`\b${H}\s*[~〜\-]\s*${H}\s*h\b`, "i"));
          if (m && !looksLikeClock(m[0])) {
            paymentRange = `${m[1]}h-${m[2]}h`;
          } else {
            // 3) ラベル付き: "精算幅: 140h〜180h"
            const m2 = src.match(new RegExp(String.raw`精算(?:幅)?[:：]?\s*${H}\s*h?\s*[~〜\-]\s*${H}\s*h\b`, "i"));
            if (m2 && !looksLikeClock(m2[0])) {
              paymentRange = `${m2[1]}h-${m2[2]}h`;
            }
          }
        }
      }
    }

    // 稼働日数
    const workingDays = trimLeadingLabel(clean(pick(/週\s*(\d+)\s*日/i)));

    // 勤務時間
    const workingHours = trimLeadingLabel(
      clean(pick(/勤務時間[:：]?\s*([^\n]+)/)) ||
      clean(pick(/フレックス（[^)]+）/))
    );

    // 出社頻度 / 勤務形態
    const attendanceFrequency = trimLeadingLabel(
      clean(pick(/出社頻度[:：]?\s*([^\n]+)/)) ||
      (/(フルリモート|完全在宅)/i.test(t) ? "フルリモート" : undefined)
    );

    let workStyle: WorkStyle | "" = detectWorkStyle(t);

    const location = trimLeadingLabel(
      clean(pick(/勤務地[:：]?\s*([^\n]+)/)) ||
      (/(フルリモート|完全在宅)/i.test(t) ? "フルリモート" : undefined)
    );

    // 面談回数
    const interviewCount = (() => {
      const n = pick(/面談(?:回数)?[:：]?\s*(\d+)/);
      return n ? parseInt(n, 10) : undefined;
    })();

    // 支払いサイト
    const paymentTerms =
      clean(pick(/(\d{2,3}\s*日サイト)/)) ||
      clean(pick(/支払いサイト[:：]?\s*([^\n]+)/));

    // 年齢制限
    const ageLimit = (() => {
      const n = pick(/(\d{2})\s*歳?\s*まで/);
      return n ? parseInt(n, 10) : undefined;
    })();

    // PC貸与（要相談/確認中も拾う）
    let pcProvided: string | boolean | undefined;
    {
      const raw = pick(/PC[^\n]*?(あり|有|なし|無|貸与|持参|要相談|確認中)/i);
      if (raw) {
        if (/要相談|確認中/i.test(raw)) {
          pcProvided = "要相談";
        } else {
          pcProvided = coerceBooleanJa(raw);
        }
      }
    }

    // 外国籍可否（NG/不可→false、可/OK→true）
    const foreignerAcceptable = (() => {
      const raw = pick(/外国籍[^\n]*?(可|不可|NG|OK)/i);
      if (!raw) return undefined;
      const s = toHalfWidth(raw);
      if (/不可|NG/i.test(s)) return false;
      if (/可|OK/i.test(s)) return true;
      return undefined;
    })();

    // スキル
    const mustBlock =
      pick(/【?(必須スキル|必須)】?[:：]?\s*([\s\S]*?)(?:\n【|$)/, 2) ||
      pick(/【?スキル】?[:：]?\s*([\s\S]*?)(?:\n【|$)/, 1);
    const mustSkills = splitSkills(mustBlock);

    const niceBlock = pick(/【?(歓迎|尚可|あれば尚可)】?[:：]?\s*([\s\S]*?)(?:\n【|$)/, 2);
    const niceSkills = splitSkills(niceBlock);

    // --- Sections ---
    const sectionDesc = pickSectionFlexible(t, SECTION_LABELS.desc);
    const sectionWork = pickSectionFlexible(t, SECTION_LABELS.work);
    const sectionBg = pickSectionFlexible(t, SECTION_LABELS.background);
    const sectionEnv = pickSectionFlexible(t, SECTION_LABELS.env);
    const sectionNg = pickSectionFlexible(t, SECTION_LABELS.ng);

    // 使用言語（names-only）と年数付き（names+years）
    const explicitLanguage = clean(pick(/使用言語[:：]?\s*([^\n]+)/));
    const langFromEnv = sectionEnv ? extractLanguagesAndYears(sectionEnv) : undefined; // names+years
    const langFromWhole = extractLanguagesAndYears(t); // names+years
    const languageYears = clean(explicitLanguage) || clean(langFromEnv) || clean(langFromWhole);
    const language = languageYears
      ? languageYears
          .replace(/\\s*\\d+(?:\\.\\d+)?\\s*年(?:以上)?/g, '')
          .replace(/\\s{2,}/g, ' ')
          .replace(/\\s*,\\s*,/g, ',')
          .replace(/,\\s*,/g, ',')
          .replace(/\\s+,/g, ', ')
          .trim()
      : undefined;

    // 詳細（業務内容）はそのまま/軽め整形。案件詳細は要約して短文化。
    const detailedDescription = sectionWork || sectionDesc || clean(t);
    const description = summarizeDescription(sectionDesc || sectionWork || clean(t) || "");

    const recruitmentBackground = clean(sectionBg);
    const developmentEnvironment = clean(sectionEnv);
    const ngConditions = clean(sectionNg);

    return {
      title: firstLine,
      description,
      detailedDescription,
      location,
      workStyle,
      workingDays,
      workingHours,
      attendanceFrequency,
      interviewCount,
      paymentTerms,
      ageLimit,
      paymentRange,
      recruitmentBackground,
      developmentEnvironment,
      ngConditions,
      budgetMin,
      budgetMax,
      pcProvided,
      foreignerAcceptable,
      mustSkills,
      niceSkills,
      language,
      languageYears,
    };
  }

  const handlePdfDataExtracted = async (data: any) => {
    try {
      setIsParsing(true);
      const normalized = await normalizeWithLLM(data || {});
      applyAiNormalizedData(normalized);
      setShowPdfUploader(false);
    } catch (e) {
      console.error('PDF抽出データのAI正規化でエラー:', e);
      alert('PDFからのAI正規化に失敗しました。もう一度お試しください。');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('案件名を入力してください')
      return
    }

    if (formData.mustSkills.length === 0) {
      alert('必須スキルを少なくとも1つ追加してください')
      return
    }

    // 最低・最高予算の逆転ガード
    if (formData.budgetMin && formData.budgetMax) {
      const minV = parseFloat(toHalfWidth(formData.budgetMin));
      const maxV = parseFloat(toHalfWidth(formData.budgetMax));
      if (!isNaN(minV) && !isNaN(maxV) && minV > maxV) {
        alert('最低予算が最高予算を上回っています。数値を確認してください。');
        return;
      }
    }

    // 数値の正規化・整合性チェック
    const bMin = formData.budgetMin ? parseFloat(toHalfWidth(formData.budgetMin)) : undefined;
    const bMax = formData.budgetMax ? parseFloat(toHalfWidth(formData.budgetMax)) : undefined;
    let normMin = bMin;
    let normMax = bMax;
    if (normMin != null && normMax != null && normMin > normMax) {
      // 逆転を補正
      [normMin, normMax] = [normMax, normMin];
    }

    // スキルの重複・空白除去
    const mustSkills = Array.from(new Set(formData.mustSkills.map((s) => s.trim()).filter(Boolean)));
    const niceSkills = Array.from(new Set(formData.niceSkills.map((s) => s.trim()).filter(Boolean)));

    setIsSubmitting(true)

    try {
      // languages から互換フィールドを作成
      let derivedLanguageYears = formData.languageYears;
      let derivedLanguage = formData.language;
      if (formData.languages && formData.languages.length > 0) {
        derivedLanguageYears = joinPairsToYearsList(formData.languages);
        derivedLanguage = formData.languages.map((p) => p.name).filter(Boolean).join(", ");
      }
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        detailedDescription: formData.detailedDescription.trim() || undefined,
        recruitmentBackground: formData.recruitmentBackground.trim() || undefined,
        mustSkills,
        niceSkills: niceSkills.length > 0 ? niceSkills : undefined,
        mustSkillsText: formData.mustSkillsText.trim() || undefined,
        niceSkillsText: formData.niceSkillsText.trim() || undefined,
        budgetMin: normMin != null ? Math.round(normMin) : undefined,
        budgetMax: normMax != null ? Math.round(normMax) : undefined,
        workStyle: formData.workStyle || undefined,
        startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : undefined,
        language: derivedLanguage?.trim() || undefined,
        languageYears: derivedLanguageYears?.trim() || undefined,
        commerceTier: formData.commerceTier.trim() || undefined,
        commerceLimit: formData.commerceLimit.trim() || undefined,
        location: formData.location.trim() || undefined,
        workingHours: formData.workingHours.trim() || undefined,
        workingDays: formData.workingDays.trim() || undefined,
        attendanceFrequency: formData.attendanceFrequency.trim() || undefined,
        interviewCount: formData.interviewCount ? parseInt(formData.interviewCount) : undefined,
        paymentRange: formData.paymentRange.trim() || undefined,
        pcProvided: formData.pcProvided ? (formData.pcProvided === 'true' ? true : formData.pcProvided === 'false' ? false : undefined) : undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        ageLimit: formData.ageLimit ? parseInt(formData.ageLimit) : undefined,
        foreignerAcceptable: formData.foreignerAcceptable ? formData.foreignerAcceptable === 'true' : undefined,
        ngConditions: formData.ngConditions.trim() || undefined,
        developmentEnvironment: formData.developmentEnvironment.trim() || undefined
      }

      if (isEditing && projectId) {
        await updateProject(projectId, projectData)
      } else {
        await addProject(projectData)
      }

      navigate('/projects')
    } catch (error) {
      console.error('プロジェクト保存エラー:', error)
      alert('保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={isEditing ? '案件編集' : '新規案件'}
        description={isEditing ? '案件情報を編集します' : '新しい案件を登録します'}
      >
        <Button variant="outline" onClick={() => navigate('/projects')}>
          戻る
        </Button>
      </SectionHeader>

      <form onSubmit={handleSubmit}>
        {!isEditing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                PDF自動入力
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showPdfUploader ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPdfUploader(true)}
                  className="w-full"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  案件概要PDFから自動入力
                </Button>
              ) : (
                <PdfUploader
                  extractionType="project"
                  onDataExtracted={handlePdfDataExtracted}
                  onClose={() => setShowPdfUploader(false)}
                />
              )}
              <Separator className="my-6" />
              <div className="space-y-2">
                <Label htmlFor="manualText">テキストから自動入力（PDF抽出の代替）</Label>
                <Textarea
                  id="manualText"
                  placeholder="案件の要点（案件名、詳細、必須スキル、予算、勤務地、開始時期など）を貼り付けてください。"
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={aiAutofill}
                      onChange={(e) => setAiAutofill(e.target.checked)}
                    />
                    AIで空欄を自動補完（自信ありの場合のみ）
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={handleManualTextFill} disabled={isParsing}>
                    {isParsing ? "解析中..." : "テキストから自動入力"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="title">案件名 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="案件名を入力"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">案件詳細</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="案件の詳細説明を入力"
                  rows={4}
                />
              </div>

              <div className="md:col-span-2">
                <Label>必須スキル *</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="スキルを入力"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(skillInput, 'must')
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill(skillInput, 'must')}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.mustSkills.map((skill) => (
                    <Badge key={skill} className="bg-red-100 text-red-800">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill, 'must')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>歓迎スキル</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={niceSkillInput}
                    onChange={(e) => setNiceSkillInput(e.target.value)}
                    placeholder="歓迎スキルを入力"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(niceSkillInput, 'nice')
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill(niceSkillInput, 'nice')}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.niceSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill, 'nice')}
                        className="ml-1 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="budgetMin">最低予算（万円）</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                  placeholder="最低予算"
                />
              </div>

              <div>
                <Label htmlFor="budgetMax">最高予算（万円）</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                  placeholder="最高予算"
                />
              </div>

              <div>
                <Label>勤務形態</Label>
                <Select
                  value={formData.workStyle}
                  onValueChange={(value: WorkStyle) => setFormData(prev => ({ ...prev, workStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="勤務形態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onsite">常駐</SelectItem>
                    <SelectItem value="remote">リモート</SelectItem>
                    <SelectItem value="hybrid">ハイブリッド</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>開始予定日</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate && !isNaN(formData.startDate.getTime()) ? (
                        format(formData.startDate, "yyyy年MM月dd日", { locale: ja })
                      ) : (
                        <span>開始日を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate && !isNaN(formData.startDate.getTime()) ? formData.startDate : undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="md:col-span-2">
                <Label>言語経験</Label>
                <div className="space-y-2">
                  {(formData.languages || []).map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="言語 (例: Java)"
                        value={item.name}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const updated = [...(prev.languages || [])];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            return { ...prev, languages: updated };
                          })
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="年数 (例: 3年, 2年以上)"
                        value={item.years}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const updated = [...(prev.languages || [])];
                            // 軽い正規化: "3" → "3年"
                            const val = e.target.value.replace(/^\s*(\d+(?:\.\d+)?)\s*$/, "$1年");
                            updated[idx] = { ...updated[idx], years: val };
                            return { ...prev, languages: updated };
                          })
                        }
                        className="w-40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            languages: (prev.languages || []).filter((_, i) => i !== idx),
                          }))
                        }
                        title="削除"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          languages: [...(prev.languages || []), { name: "", years: "" }],
                        }))
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" /> 追加
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const source =
                          formData.developmentEnvironment ||
                          formData.detailedDescription ||
                          formData.description ||
                          "";
                        const ly = extractLanguagesAndYears(source || "") || "";
                        const norm = normalizeYearsList(ly);
                        const pairs = pairsFromYearsList(norm);
                        if (pairs.length) {
                          setFormData((prev) => ({ ...prev, languages: pairs }));
                        }
                      }}
                      title="開発環境/詳細から言語（年数）を抽出"
                    >
                      抽出
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="commerceTier">商流</Label>
                <Select
                  value={formData.commerceTier}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commerceTier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="商流を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="元請け">元請け</SelectItem>
                    <SelectItem value="1次請け">1次請け</SelectItem>
                    <SelectItem value="2次請け">2次請け</SelectItem>
                    <SelectItem value="3次請け">3次請け</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="commerceLimit">商流制限</Label>
                <Input
                  id="commerceLimit"
                  value={formData.commerceLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, commerceLimit: e.target.value }))}
                  placeholder="貴社まで、2次請けまで等"
                />
              </div>

              <div>
                <Label htmlFor="location">勤務地</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="フルリモート、東京都港区、など"
                />
              </div>

              <div>
                <Label htmlFor="workingHours">勤務時間</Label>
                <Input
                  id="workingHours"
                  value={formData.workingHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHours: e.target.value }))}
                  placeholder="フレックス（コアタイム 10:00〜17:00）等"
                />
              </div>

              <div>
                <Label htmlFor="workingDays">稼働日数</Label>
                <Input
                  id="workingDays"
                  value={formData.workingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingDays: e.target.value }))}
                  placeholder="週5日、週4日等"
                />
              </div>

              <div>
                <Label htmlFor="attendanceFrequency">出社頻度</Label>
                <Input
                  id="attendanceFrequency"
                  value={formData.attendanceFrequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendanceFrequency: e.target.value }))}
                  placeholder="フルリモート、週1回出社等"
                />
              </div>

              <div>
                <Label htmlFor="interviewCount">面談回数</Label>
                <Input
                  id="interviewCount"
                  type="number"
                  value={formData.interviewCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, interviewCount: e.target.value }))}
                  placeholder="1"
                  min="1"
                />
              </div>

              <div>
                <Label htmlFor="paymentRange">精算幅</Label>
                <Input
                  id="paymentRange"
                  value={formData.paymentRange}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentRange: e.target.value }))}
                  placeholder="140h-180h等"
                />
              </div>

              <div>
                <Label>PC貸与</Label>
                <Select
                  value={formData.pcProvided}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pcProvided: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PC貸与有無を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">あり</SelectItem>
                    <SelectItem value="false">なし</SelectItem>
                    <SelectItem value="要相談">要相談</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentTerms">支払いサイト</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  placeholder="45日サイト等"
                />
              </div>

              <div>
                <Label htmlFor="ageLimit">年齢制限</Label>
                <Input
                  id="ageLimit"
                  type="number"
                  value={formData.ageLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageLimit: e.target.value }))}
                  placeholder="45"
                  min="20"
                  max="70"
                />
              </div>

              <div>
                <Label>外国籍</Label>
                <Select
                  value={formData.foreignerAcceptable}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, foreignerAcceptable: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="外国籍可否を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">可能</SelectItem>
                    <SelectItem value="false">不可</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div>
                <Label htmlFor="detailedDescription">業務内容（詳細）</Label>
                <Textarea
                  id="detailedDescription"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, detailedDescription: e.target.value }))}
                  placeholder="フロントエンドからバックエンド、インフラも含む横断的なプロダクト開発を担当し..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="recruitmentBackground">募集背景</Label>
                <Textarea
                  id="recruitmentBackground"
                  value={formData.recruitmentBackground}
                  onChange={(e) => setFormData(prev => ({ ...prev, recruitmentBackground: e.target.value }))}
                  placeholder="新規プロダクト開発のため、チーム強化のため等"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="developmentEnvironment">開発環境</Label>
                <Textarea
                  id="developmentEnvironment"
                  value={formData.developmentEnvironment}
                  onChange={(e) => setFormData(prev => ({ ...prev, developmentEnvironment: e.target.value }))}
                  placeholder="使用技術、ツール、環境等の詳細"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="mustSkillsText">必須条件</Label>
                <Textarea
                  id="mustSkillsText"
                  value={formData.mustSkillsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, mustSkillsText: e.target.value }))}
                  placeholder="必須条件の原文をそのまま貼り付け/入力してください"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="niceSkillsText">尚良（歓迎）条件</Label>
                <Textarea
                  id="niceSkillsText"
                  value={formData.niceSkillsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, niceSkillsText: e.target.value }))}
                  placeholder="歓迎/尚可条件の原文をそのまま貼り付け/入力してください"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="ngConditions">NG条件</Label>
                <Textarea
                  id="ngConditions"
                  value={formData.ngConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, ngConditions: e.target.value }))}
                  placeholder="特定企業出身者NG、競合他社経験者NG等"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/projects')}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#1E63F3] hover:bg-[#1E63F3]/90"
              >
                {isSubmitting ? '保存中...' : isEditing ? '更新' : '登録'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}