import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { supabase } from "./supabase.tsx";

const app = new Hono();
const currentPartnerId = 'current_company'; // 現在のユーザー会社ID

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b70e7431/health", (c) => {
  return c.json({ status: "ok" });
});

// Database initialization endpoint (simplified for KV store approach)
app.post("/make-server-b70e7431/init-database", async (c) => {
  try {
    console.log('Initializing data structure...');
    
    // KVストアベースのデータ初期化
    const emptyDataStructure = {
      partners: [],
      follows: [],
      projects: [],
      talents: [],
      matches: [],
      shares: [],
      partnerProjects: [],
      partnerTalents: []
    };
    
    // 各データ構造を初期化（既存データがある場合は上書きしない）
    for (const [key, defaultValue] of Object.entries(emptyDataStructure)) {
      const existingData = await kv.get(key);
      if (!existingData || existingData.length === 0) {
        await kv.set(key, defaultValue);
        console.log(`Initialized ${key} with empty array`);
      } else {
        console.log(`${key} already has data (${existingData.length} items)`);
      }
    }
    
    console.log('Data structure initialization completed');
    return c.json({ 
      success: true, 
      message: "Data structure initialized successfully",
      initialized: Object.keys(emptyDataStructure)
    });
    
  } catch (error) {
    console.error('Data initialization error:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// ===== PDF PARSING API =====

// PDFファイルからテキストを抽出（サーバーサイド処理）
app.post("/make-server-b70e7431/extract-pdf-text", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return c.json({ text: null, error: "PDFファイルがアップロードされていません" }, 400);
    }

    if (file.type !== 'application/pdf') {
      return c.json({ text: null, error: "PDFファイルを選択してください" }, 400);
    }

    // ファイルサイズ制限（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ text: null, error: "ファイルサイズが大きすぎます（10MB以下にしてください）" }, 400);
    }

    // PDFファイルを一時ファイルとして保存
    const tempDir = '/tmp';
    const tempFileName = `${Date.now()}_${file.name}`;
    const tempFilePath = `${tempDir}/${tempFileName}`;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await Deno.writeFile(tempFilePath, uint8Array);

      console.log(`Processing PDF file: ${file.name}, Size: ${file.size} bytes`);

      // 改善されたPDFテキスト抽出
      try {
        const pdfData = await Deno.readFile(tempFilePath);
        let extractedText = '';

        // PDFヘッダーの確認
        const pdfHeader = new TextDecoder('utf-8', { fatal: false }).decode(pdfData.slice(0, 100));
        console.log('PDF Header:', pdfHeader.substring(0, 50));

        // 複数のエンコーディングを試行
        const encodings = ['utf-8', 'latin1'];
        let bestResult = '';
        let maxScore = 0;

        for (const encoding of encodings) {
          try {
            let decodedText = '';
            
            // UTF-8とLatin1（バイナリ安全）で試行
            if (encoding === 'utf-8') {
              decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pdfData);
            } else if (encoding === 'latin1') {
              // Latin1（ISO-8859-1）でデコード（バイナリデータをそのまま処理）
              decodedText = Array.from(pdfData, byte => String.fromCharCode(byte)).join('');
            }

            // PDFからテキストを抽出する複数の方法を試行
            const extractionMethods = [
              // Method 1: 括弧内のテキスト抽出（最も一般的）
              () => {
                const matches = decodedText.match(/\(((?:[^()\]|\\.|\\[0-9]{1,3})*)\)/g);
                if (!matches) return '';
                return matches
                  .map(match => match.slice(1, -1))
                  .map(text => {
                    // エスケープ文字の処理
                    return text
                      .replace(/\\([()])/g, '$1')  // \( \) → ( )
                      .replace(/\\([rntf])/g, (_, char) => {
                        switch (char) {
                          case 'r': return '\r';
                          case 'n': return '\n';
                          case 't': return '\t';
                          case 'f': return '\f';
                          default: return char;
                        }
                      })
                      .replace(/\\([0-7]{1,3})/g, (_, octal) => {
                        // 8進数文字コードをUnicodeに変換
                        const charCode = parseInt(octal, 8);
                        return String.fromCharCode(charCode);
                      });
                  })
                  .filter(text => text.trim().length > 0)
                  .join(' ');
              },
              
              // Method 2: 角括弧内のテキスト（代替形式）
              () => {
                const matches = decodedText.match(/\[((?:[^\[\]\\]|\\.|\\[0-9]{1,3})*)\]/g);
                if (!matches) return '';
                return matches
                  .map(match => match.slice(1, -1))
                  .filter(text => text.trim().length > 0)
                  .join(' ');
              },

              // Method 3: BT/ET ブロック内のテキスト（テキストブロック）
              () => {
                const btMatches = decodedText.match(/BT([\s\S]*?)ET/g);
                if (!btMatches) return '';
                return btMatches
                  .map(block => {
                    const textMatches = block.match(/\(((?:[^()\\]|\\.|\\[0-9]{1,3})*)\)/g);
                    if (!textMatches) return '';
                    return textMatches
                      .map(match => match.slice(1, -1))
                      .join(' ');
                  })
                  .filter(text => text.trim().length > 0)
                  .join(' ');
              },

              // Method 4: 日本語文字の直接抽出
              () => {
                const matches = decodedText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF65-\uFF9F\u3000-\u303F]+/g);
                return matches ? matches.join(' ') : '';
              },

              // Method 5: 英数字とスペースを含む文字列
              () => {
                const matches = decodedText.match(/[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s@.\-_]{5,}/g);
                return matches ? matches
                  .filter(text => text.trim().length > 3)
                  .join(' ') : '';
              },

              // Method 6: Mac PDF特有のUTF-16処理
              () => {
                if (encoding === 'latin1') {
                  // UTF-16 BOMの検出
                  const utf16BeMatches = decodedText.match(/\ufeff([^\ufeff]+)/g);
                  if (utf16BeMatches) {
                    return utf16BeMatches
                      .map(match => match.replace(/\ufeff/g, ''))
                      .join(' ');
                  }
                  
                  // Mac特有の文字コード変換
                  let converted = decodedText;
                  // MacRomanからUTF-8への一般的な変換パターン
                  const macRomanToUtf8 = {
                    'Ç': 'Ç', 'ü': 'ü', 'é': 'é', 'â': 'â', 'ä': 'ä', 'à': 'à',
                    'å': 'å', 'ç': 'ç', 'ê': 'ê', 'ë': 'ë', 'è': 'è', 'ï': 'ï',
                    'î': 'î', 'ì': 'ì', 'Ä': 'Ä', 'Å': 'Å'
                  };
                  
                  Object.entries(macRomanToUtf8).forEach(([from, to]) => {
                    converted = converted.replace(new RegExp(from, 'g'), to);
                  });
                  
                  return converted;
                }
                return '';
              }
            ];

            let result = '';
            for (const method of extractionMethods) {
              result = method();
              if (result.trim().length > 10) {
                break;
              }
            }

            // 結果の品質を評価（日本語文字の割合、文字数、文字化け検出など）
            const japaneseChars = (result.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
            const alphaNumChars = (result.match(/[A-Za-z0-9]/g) || []).length;
            const totalChars = result.length;
            const spaceChars = (result.match(/\s/g) || []).length;
            const commonSymbols = (result.match(/[.,!?;:()\\@]/g) || []).length;
            
            // より厳密な文字化け検出（制御文字と明らかに意味のない文字のみ）
            const controlChars = (result.match(/[\u0000-\u001F\u007F-\u009F]/g) || []).length;
            const weirdSymbols = (result.match(/[^\u0020-\u007E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\u00A0-\u00FF]/g) || []).length;
            const actualWeirdChars = controlChars + weirdSymbols;
            const weirdCharRatio = totalChars > 0 ? actualWeirdChars / totalChars : 0;
            
            // スコア計算（より寛容な評価）
            let score = 0;
            if (totalChars > 0) {
              const readableChars = japaneseChars + alphaNumChars + spaceChars + commonSymbols;
              const readableRatio = readableChars / totalChars;
              const contentScore = Math.min(totalChars / 50, 20); // 文字数ボーナス（最大20点）
              const qualityPenalty = weirdCharRatio > 0.5 ? -30 : 0; // 文字化け率50%以上で減点
              const japaneseBonus = japaneseChars > 0 ? 10 : 0; // 日本語が含まれている場合のボーナス
              
              score = (readableRatio * 100) + contentScore + qualityPenalty + japaneseBonus;
            }
            
            console.log(`Encoding ${encoding}: Score=${score.toFixed(2)}, Length=${totalChars}, Readable=${(japaneseChars + alphaNumChars + spaceChars + commonSymbols)}, Weird=${actualWeirdChars} (${(weirdCharRatio*100).toFixed(1)}%)`);

            if (score > maxScore) {
              maxScore = score;
              bestResult = result;
            }

          } catch (encodingError) {
            console.log(`Encoding ${encoding} failed:`, encodingError.message);
            continue;
          }
        }

        extractedText = bestResult;

        // テキストのクリーンアップ
        if (extractedText.trim()) {
          extractedText = extractedText
            .replace(/\s+/g, ' ')  // 連続する空白を1つにまとめる
            .replace(/[\x00-\x1F\x7F]/g, '')  // 制御文字を除去
            .trim();
        }

        console.log(`Extracted text length: ${extractedText.length} characters`);
        console.log(`Sample text: ${extractedText.substring(0, 100)}...`);

        if (!extractedText.trim() || extractedText.length < 10) {
          throw new Error('PDFからテキストを抽出できませんでした');
        }

        return c.json({ 
          text: extractedText.trim(),
          error: null 
        });

      } catch (extractError) {
        console.error('PDF text extraction error:', extractError);
        return c.json({ 
          text: null, 
          error: "PDFからテキストを抽出できませんでした。画像のみのPDFまたは保護されたPDFの可能性があります。手動でテキストを入力してください。" 
        }, 400);
      }

    } finally {
      // 一時ファイルを削除
      try {
        await Deno.remove(tempFilePath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

  } catch (error) {
    console.error('Error processing PDF file:', error);
    return c.json({ text: null, error: error.message }, 500);
  }
});

// PDFテキストから案件情報を抽出
app.post("/make-server-b70e7431/parse-project-pdf", async (c) => {
  try {
    const { text } = await c.req.json();
    
    if (!text || text.trim().length === 0) {
      return c.json({ data: null, error: "PDFテキストが空です" }, 400);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ data: null, error: "OpenAI API key not configured" }, 500);
    }

    const prompt = `
以下のテキストから案件情報を抽出して、JSON形式で返してください。

抽出する項目：
- title: 案件タイトル
- description: 案件詳細説明
- detailedDescription: 業務内容の詳細
- recruitmentBackground: 募集背景
- category: カテゴリ（システム開発、Web開発、モバイルアプリ、AI・機械学習、インフラ、その他）
- budget: 予算（数値のみ、単位は除く）
- duration: 期間（ヶ月数）
- status: ステータス（募集中、進行中、完了）
- requiredSkills: 必要スキル（配列形式）
- niceSkills: 歓迎スキル（配列形式）
- location: 勤務地
- remote: リモート可能か（true/false）
- startDate: 開始予定日（YYYY-MM-DD形式）
- endDate: 終了予定日（YYYY-MM-DD形式）
- commerceTier: 商流（元請け、1次請け、2次請け、3次請け）
- commerceLimit: 商流制限（例：貴社まで、2次請けまで）
- workingHours: 勤務時間（例：フレックス（コアタイム 10:00〜17:00））
- workingDays: 稼働日数（例：週5日、週4日）
- attendanceFrequency: 出社頻度（例：フルリモート、週1回出社）
- interviewCount: 面談回数（数値のみ）
- paymentRange: 精算幅（例：140h-180h）
- pcProvided: PC貸与（true/false）
- paymentTerms: 支払いサイト（例：45日サイト）
- ageLimit: 年齢制限（数値のみ、45歳まで → 45）
- foreignerAcceptable: 外国籍可否（true/false）
- ngConditions: NG条件
- developmentEnvironment: 開発環境の詳細

テキスト：
${text}

必ずJSON形式で回答してください。情報が不明な場合は適切なデフォルト値またはnullを設定してください。
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは案件情報を抽出する専門AIです。必ずJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI response is empty');
    }

    // JSONパース
    let parsedData;
    try {
      // JSONコードブロックから抽出する場合
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('AI response is not valid JSON');
    }

    console.log('Extracted project data:', parsedData);
    return c.json({ data: parsedData, error: null });

  } catch (error) {
    console.error('Error parsing project PDF:', error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// PDFテキストから人材情報を抽出
app.post("/make-server-b70e7431/parse-talent-pdf", async (c) => {
  try {
    const { text } = await c.req.json();
    
    if (!text || text.trim().length === 0) {
      return c.json({ data: null, error: "PDFテキストが空です" }, 400);
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ data: null, error: "OpenAI API key not configured" }, 500);
    }

    const prompt = `
以下のテキストから人材情報を抽出して、JSON形式で返してください。

抽出する項目：
- name: 氏名
- title: 職種・役職
- description: 詳細説明・自己PR
- category: カテゴリ（エンジニア、デザイナー、PM、コンサルタント、その他）
- age: 年齢（数値のみ）
- gender: 性別
- nationality: 国籍
- affiliation: 所属
- nearestStation: 最寄駅
- weeklyWorkDays: 週稼働（週1〜週5）
- role: 役割・職種
- experience: 総合的な経験年数（数値のみ、不明な場合はnullを設定）
- skills: スキル（配列形式）
- skillExperience: 各スキルの経験年数（オブジェクト形式、例：{"React": 3, "TypeScript": 2}、不明な場合は空オブジェクト）
- certifications: 資格（配列形式）
- education: 学歴
- previousCompanies: 職歴（配列形式）
- availability: 稼働可能時期
- hourlyRate: 時給（数値のみ、単位は除く）
- monthlyRate: 月給（数値のみ、単位は除く）
- rateManYen: 月単価（万円ベース、数値のみ、120万円なら120）
- location: 希望勤務地
- remote: リモート可能か（true/false）
- requiredConditions: 必須条件
- ngConditions: NG条件
- languages: 使用可能言語（配列形式）

テキスト：
${text}

必ずJSON形式で回答してください。情報が不明な場合は null を設定してください。経験年数については、明確に記載されているもののみ抽出し、推測で数値を設定しないでください。スキルの経験年数が個別に記載されている場合のみ skillExperience に設定してください。
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは人材情報を抽出する専門AIです。必ずJSON形式で回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI response is empty');
    }

    // JSONパース
    let parsedData;
    try {
      // JSONコードブロックから抽出する場合
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('AI response is not valid JSON');
    }

    console.log('Extracted talent data:', parsedData);
    return c.json({ data: parsedData, error: null });

  } catch (error) {
    console.error('Error parsing talent PDF:', error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// AI案件生成API
app.post("/make-server-b70e7431/generate-project", async (c) => {
  try {
    const { prompt, category, skillLevel, workStyle } = await c.req.json();
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ data: null, error: "OpenAI API key not configured" }, 500);
    }

    // B2B SES案件生成のためのプロンプト
    const systemPrompt = `
あなたはB2B SES（システムエンジニアリングサービス）マッチングプラットフォームの案件生成AIです。
リアルで実現可能なB2B SES案件を生成してください。

以下の条件を満たす案件を作成してください：
- 実際のSES業界で見かける現実的な案件内容
- 適切な予算レンジ（時給3,000〜15,000円程度）
- 明確な技術要件とスキル要求
- 現実的な期間設定（1〜12ヶ月）
- 商流情報（元請け〜3次請けの範囲）
- 具体的で現実的な勤務条件と制限事項

カテゴリ: ${category || 'システム開発'}
スキルレベル: ${skillLevel || '中級'}
勤務形態: ${workStyle || 'hybrid'}

必ずJSON形式で以下の構造で回答してください：
{
  "title": "案件タイトル",
  "description": "案件の概要説明（200文字程度）",
  "detailedDescription": "業務内容の詳細（500文字程度、フロントエンドからバックエンド、インフラ含め具体的な開発内容を担当している）",
  "recruitmentBackground": "募集背景（新規プロジェクト開始のため、チーム強化のため、など具体的な理由）",
  "mustSkills": ["必須スキル1", "必須スキル2", "必須スキル3"],
  "niceSkills": ["歓迎スキル1", "歓迎スキル2"],
  "budgetMin": 予算下限（数値）,
  "budgetMax": 予算上限（数値）,
  "workStyle": "onsite|remote|hybrid",
  "startDate": "開始予定日（YYYY-MM-DD）",
  "language": "主な使用言語（JavaScript、Java等、複数ある場合はカンマ区切り）",
  "commerceTier": "元請け|1次請け|2次請け|3次請け",
  "commerceLimit": "商流制限（例：貴社まで、2次請けまで等）",
  "location": "勤務地（フルリモート、東京都渋谷区、など）",
  "workingHours": "勤務時間（例：フレックス（コアタイム 10:00〜17:00）等）",
  "workingDays": "稼働日数（例：週5日、週4日等）",
  "attendanceFrequency": "出社頻度（例：フルリモート、週1回出社、適宜出社等）",
  "interviewCount": 面談回数（数値、1-3の範囲）,
  "paymentRange": "精算幅（例：140h-180h等）",
  "pcProvided": PC貸与（true/false）,
  "paymentTerms": "支払いサイト（例：45日サイト等）",
  "ageLimit": 年齢制限（数値、45歳まで → 45、制限なければnull）,
  "foreignerAcceptable": 外国籍可否（true/false）,
  "ngConditions": "NG条件（例：特定企業出身NG、最低経験年数等、なければ\\"特になし\\"）",
  "developmentEnvironment": "開発環境（例：使用技術、ツール、環境等の詳細）"
}

各項目は現実的で具体的な内容にし、実際のSES案件で見られる条件を反映してください。
`;

    const userPrompt = prompt || `
${category || 'システム開発'}分野で、${skillLevel || '中級'}レベルのエンジニア向けの${workStyle === 'remote' ? 'フルリモート' : workStyle === 'onsite' ? '出社' : 'ハイブリッド'}案件を生成してください。
実際のSES業界で需要の高い技術スタックを使用し、現実的な予算設定でお願いします。
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI response is empty');
    }

    // JSONパース
    let parsedData;
    try {
      // JSONコードブロックから抽出する場合
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('AI response is not valid JSON');
    }

    console.log('Generated project data:', parsedData);
    return c.json({ data: parsedData, error: null });

  } catch (error) {
    console.error('Error generating project:', error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// ===== PARTNERS API =====

// 取引先一覧取得
app.get("/make-server-b70e7431/partners", async (c) => {
  try {
    const partners = await kv.get("partners") || [];
    return c.json({ data: partners, error: null });
  } catch (error) {
    console.log("Error fetching partners:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// 新規取引先追加
app.post("/make-server-b70e7431/partners", async (c) => {
  try {
    const partnerData = await c.req.json();
    const partners = await kv.get("partners") || [];
    
    const newPartner = {
      id: Date.now().toString(),
      ...partnerData,
      projectCount: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      tags: partnerData.tags || []
    };
    
    partners.push(newPartner);
    await kv.set("partners", partners);
    
    return c.json({ data: newPartner, error: null });
  } catch (error) {
    console.log("Error creating partner:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// 取引先更新
app.put("/make-server-b70e7431/partners/:id", async (c) => {
  try {
    const partnerId = c.req.param("id");
    const updateData = await c.req.json();
    const partners = await kv.get("partners") || [];
    
    const partnerIndex = partners.findIndex(p => p.id === partnerId);
    if (partnerIndex === -1) {
      return c.json({ data: null, error: "Partner not found" }, 404);
    }
    
    partners[partnerIndex] = { ...partners[partnerIndex], ...updateData };
    await kv.set("partners", partners);
    
    return c.json({ data: partners[partnerIndex], error: null });
  } catch (error) {
    console.log("Error updating partner:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// フォロー関連API
app.get("/make-server-b70e7431/follows", async (c) => {
  try {
    const follows = await kv.get("follows") || [];
    console.log(`Fetching follows: found ${follows.length} follow records`);
    return c.json({ data: follows, error: null });
  } catch (error) {
    console.log("Error fetching follows:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.post("/make-server-b70e7431/follows", async (c) => {
  try {
    const { partnerId } = await c.req.json();
    console.log(`Creating follow: ${currentPartnerId} -> ${partnerId}`);
    
    let follows = await kv.get("follows") || [];
    
    // 既存のフォロー関係をチェック
    const existingFollow = follows.find(f => 
      f.followerId === currentPartnerId && f.followingId === partnerId
    );
    
    if (existingFollow) {
      console.log("Follow already exists:", existingFollow);
      return c.json({ data: existingFollow, error: null });
    }
    
    // 相手からのフォローが既にある場合は相互フォローに
    const reciprocalFollowIndex = follows.findIndex(f => 
      f.followerId === partnerId && f.followingId === currentPartnerId
    );
    
    const newFollow = {
      id: `follow_${Date.now()}`,
      followerId: currentPartnerId,
      followingId: partnerId,
      createdAt: new Date().toISOString(),
      status: 'accepted' // デモ環境では自動承認
    };
    
    // 相手からのフォローも承認済みに更新
    if (reciprocalFollowIndex !== -1) {
      follows[reciprocalFollowIndex].status = 'accepted';
      console.log("Updated reciprocal follow to accepted");
    }
    
    follows.push(newFollow);
    await kv.set("follows", follows);
    
    console.log("Follow created successfully:", newFollow);
    console.log("Total follows now:", follows.length);
    
    return c.json({ data: newFollow, error: null });
  } catch (error) {
    console.log("Error creating follow:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.delete("/make-server-b70e7431/follows/:partnerId", async (c) => {
  try {
    const partnerId = c.req.param("partnerId");
    console.log(`Removing follow: ${currentPartnerId} <-> ${partnerId}`);
    
    let follows = await kv.get("follows") || [];
    const originalLength = follows.length;
    
    follows = follows.filter(f => 
      !(f.followerId === currentPartnerId && f.followingId === partnerId) &&
      !(f.followerId === partnerId && f.followingId === currentPartnerId)
    );
    
    await kv.set("follows", follows);
    
    console.log(`Unfollow completed: removed ${originalLength - follows.length} follow records`);
    console.log("Total follows now:", follows.length);
    
    return c.json({ data: { success: true }, error: null });
  } catch (error) {
    console.log("Error removing follow:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// ===== PROJECTS API =====

app.get("/make-server-b70e7431/projects", async (c) => {
  try {
    const projects = await kv.get("projects") || [];
    return c.json({ data: projects, error: null });
  } catch (error) {
    console.log("Error fetching projects:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.post("/make-server-b70e7431/projects", async (c) => {
  try {
    const projectData = await c.req.json();
    const projects = await kv.get("projects") || [];
    
    const newProject = {
      id: Date.now().toString(),
      ...projectData,
      createdAt: new Date().toISOString()
    };
    
    projects.push(newProject);
    await kv.set("projects", projects);
    
    return c.json({ data: newProject, error: null });
  } catch (error) {
    console.log("Error creating project:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.put("/make-server-b70e7431/projects/:id", async (c) => {
  try {
    const projectId = c.req.param("id");
    const updateData = await c.req.json();
    const projects = await kv.get("projects") || [];
    
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return c.json({ data: null, error: "Project not found" }, 404);
    }
    
    projects[projectIndex] = { ...projects[projectIndex], ...updateData };
    await kv.set("projects", projects);
    
    return c.json({ data: projects[projectIndex], error: null });
  } catch (error) {
    console.log("Error updating project:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.delete("/make-server-b70e7431/projects/:id", async (c) => {
  try {
    const projectId = c.req.param("id");
    let projects = await kv.get("projects") || [];
    
    projects = projects.filter(p => p.id !== projectId);
    await kv.set("projects", projects);
    
    return c.json({ data: { success: true }, error: null });
  } catch (error) {
    console.log("Error deleting project:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// 共有案件取得
app.get("/make-server-b70e7431/projects/shared", async (c) => {
  try {
    const partnerProjects = await kv.get("partnerProjects") || [];
    return c.json({ data: partnerProjects, error: null });
  } catch (error) {
    console.log("Error fetching shared projects:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// ===== TALENTS API =====

app.get("/make-server-b70e7431/talents", async (c) => {
  try {
    const talents = await kv.get("talents") || [];
    return c.json({ data: talents, error: null });
  } catch (error) {
    console.log("Error fetching talents:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.post("/make-server-b70e7431/talents", async (c) => {
  try {
    const talentData = await c.req.json();
    const talents = await kv.get("talents") || [];
    
    const newTalent = {
      id: Date.now().toString(),
      ...talentData,
      createdAt: new Date().toISOString()
    };
    
    talents.push(newTalent);
    await kv.set("talents", talents);
    
    return c.json({ data: newTalent, error: null });
  } catch (error) {
    console.log("Error creating talent:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.put("/make-server-b70e7431/talents/:id", async (c) => {
  try {
    const talentId = c.req.param("id");
    const updateData = await c.req.json();
    const talents = await kv.get("talents") || [];
    
    const talentIndex = talents.findIndex(t => t.id === talentId);
    if (talentIndex === -1) {
      return c.json({ data: null, error: "Talent not found" }, 404);
    }
    
    talents[talentIndex] = { ...talents[talentIndex], ...updateData };
    await kv.set("talents", talents);
    
    return c.json({ data: talents[talentIndex], error: null });
  } catch (error) {
    console.log("Error updating talent:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.delete("/make-server-b70e7431/talents/:id", async (c) => {
  try {
    const talentId = c.req.param("id");
    let talents = await kv.get("talents") || [];
    
    talents = talents.filter(t => t.id !== talentId);
    await kv.set("talents", talents);
    
    return c.json({ data: { success: true }, error: null });
  } catch (error) {
    console.log("Error deleting talent:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// 共有人材取得
app.get("/make-server-b70e7431/talents/shared", async (c) => {
  try {
    const partnerTalents = await kv.get("partnerTalents") || [];
    return c.json({ data: partnerTalents, error: null });
  } catch (error) {
    console.log("Error fetching shared talents:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// ===== MATCHES API =====

app.get("/make-server-b70e7431/matches", async (c) => {
  try {
    const matches = await kv.get("matches") || [];
    return c.json({ data: matches, error: null });
  } catch (error) {
    console.log("Error fetching matches:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.post("/make-server-b70e7431/matches", async (c) => {
  try {
    const matchData = await c.req.json();
    const matches = await kv.get("matches") || [];
    
    const newMatch = {
      id: Date.now().toString(),
      ...matchData,
      createdAt: new Date().toISOString()
    };
    
    matches.push(newMatch);
    await kv.set("matches", matches);
    
    return c.json({ data: newMatch, error: null });
  } catch (error) {
    console.log("Error creating match:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.put("/make-server-b70e7431/matches/:id", async (c) => {
  try {
    const matchId = c.req.param("id");
    const updateData = await c.req.json();
    const matches = await kv.get("matches") || [];
    
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return c.json({ data: null, error: "Match not found" }, 404);
    }
    
    matches[matchIndex] = { ...matches[matchIndex], ...updateData };
    await kv.set("matches", matches);
    
    return c.json({ data: matches[matchIndex], error: null });
  } catch (error) {
    console.log("Error updating match:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// ===== SHARES API =====

app.get("/make-server-b70e7431/shares", async (c) => {
  try {
    const shares = await kv.get("shares") || [];
    return c.json({ data: shares, error: null });
  } catch (error) {
    console.log("Error fetching shares:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

app.post("/make-server-b70e7431/shares", async (c) => {
  try {
    const shareData = await c.req.json();
    const shares = await kv.get("shares") || [];
    
    const newShare = {
      id: Date.now().toString(),
      ...shareData,
      createdAt: new Date().toISOString()
    };
    
    shares.push(newShare);
    await kv.set("shares", shares);
    
    return c.json({ data: newShare, error: null });
  } catch (error) {
    console.log("Error creating share:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

// 初期データセットアップAPI（空のデータ構造のみ）
app.post("/make-server-b70e7431/init", async (c) => {
  try {
    // 空のデータ構造を初期化
    const emptyData = {
      partners: [],
      follows: [],
      partnerProjects: [],
      partnerTalents: [],
      projects: [],
      talents: [],
      matches: [],
      shares: []
    };

    // 各データキーが存在しない場合のみ初期化
    for (const [key, defaultValue] of Object.entries(emptyData)) {
      const existingData = await kv.get(key);
      if (existingData === null || existingData === undefined) {
        await kv.set(key, defaultValue);
        console.log(`Initialized ${key} with empty array`);
      }
    }

    return c.json({ 
      data: { 
        message: "Empty data structure initialized",
        initialized: Object.keys(emptyData)
      }, 
      error: null 
    });
  } catch (error) {
    console.log("Error setting up initial data:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

Deno.serve(app.fetch);