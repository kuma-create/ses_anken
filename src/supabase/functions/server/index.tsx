import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();
const currentPartnerId = 'current_company';

app.use('*', logger(console.log));

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

app.get("/make-server-b70e7431/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/make-server-b70e7431/init-database", async (c) => {
  try {
    console.log('Initializing data structure...');
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

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ text: null, error: "ファイルサイズが大きすぎます（10MB以下にしてください）" }, 400);
    }

    const tempDir = '/tmp';
    const tempFileName = `${Date.now()}_${file.name}`;
    const tempFilePath = `${tempDir}/${tempFileName}`;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await Deno.writeFile(tempFilePath, uint8Array);

      console.log(`Processing PDF file: ${file.name}, Size: ${file.size} bytes`);

      try {
        const pdfData = await Deno.readFile(tempFilePath);
        let extractedText = '';

        const pdfHeader = new TextDecoder('utf-8', { fatal: false }).decode(pdfData.slice(0, 100));
        console.log('PDF Header:', pdfHeader.substring(0, 50));

        const encodings = ['utf-8', 'latin1'];
        let bestResult = '';
        let maxScore = 0;

        for (const encoding of encodings) {
          try {
            let decodedText = '';
            
            if (encoding === 'utf-8') {
              decodedText = new TextDecoder('utf-8', { fatal: false }).decode(pdfData);
            } else if (encoding === 'latin1') {
              decodedText = Array.from(pdfData, byte => String.fromCharCode(byte)).join('');
            }

            const extractionMethods = [
              () => {
                const matches = decodedText.match(/\(((?:[^()\\]|\\.|\\[0-9]{1,3})*)\)/g);
                if (!matches) return '';
                return matches
                  .map(match => match.slice(1, -1))
                  .map(text => {
                    return text
                      .replace(/\\([()])/g, '$1')
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
                        const charCode = parseInt(octal, 8);
                        return String.fromCharCode(charCode);
                      });
                  })
                  .filter(text => text.trim().length > 0)
                  .join(' ');
              },
              
              () => {
                const matches = decodedText.match(/\[((?:[^\[\]\\]|\\.|\\[0-9]{1,3})*)\]/g);
                if (!matches) return '';
                return matches
                  .map(match => match.slice(1, -1))
                  .filter(text => text.trim().length > 0)
                  .join(' ');
              },

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

              () => {
                const matches = decodedText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF65-\uFF9F\u3000-\u303F]+/g);
                return matches ? matches.join(' ') : '';
              },

              () => {
                const matches = decodedText.match(/[A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s@.\-_]{5,}/g);
                return matches ? matches
                  .filter(text => text.trim().length > 3)
                  .join(' ') : '';
              },

              () => {
                if (encoding === 'latin1') {
                  const utf16BeMatches = decodedText.match(/\ufeff([^\ufeff]+)/g);
                  if (utf16BeMatches) {
                    return utf16BeMatches
                      .map(match => match.replace(/\ufeff/g, ''))
                      .join(' ');
                  }
                  
                  let converted = decodedText;
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

            const japaneseChars = (result.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
            const alphaNumChars = (result.match(/[A-Za-z0-9]/g) || []).length;
            const totalChars = result.length;
            const spaceChars = (result.match(/\s/g) || []).length;
            const commonSymbols = (result.match(/[.,!?;:()\-@]/g) || []).length;
            
            const controlChars = (result.match(/[\u0000-\u001F\u007F-\u009F]/g) || []).length;
            const weirdSymbols = (result.match(/[^\u0020-\u007E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\u00A0-\u00FF]/g) || []).length;
            const actualWeirdChars = controlChars + weirdSymbols;
            const weirdCharRatio = totalChars > 0 ? actualWeirdChars / totalChars : 0;
            
            let score = 0;
            if (totalChars > 0) {
              const readableChars = japaneseChars + alphaNumChars + spaceChars + commonSymbols;
              const readableRatio = readableChars / totalChars;
              const contentScore = Math.min(totalChars / 50, 20);
              const qualityPenalty = weirdCharRatio > 0.5 ? -30 : 0;
              const japaneseBonus = japaneseChars > 0 ? 10 : 0;
              
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

        if (extractedText.trim()) {
          extractedText = extractedText
            .replace(/\s+/g, ' ')
            .replace(/[\x00-\x1F\x7F]/g, '')
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

// AI案件生成API
app.post("/make-server-b70e7431/generate-project", async (c) => {
  try {
    const { prompt, category, skillLevel, workStyle } = await c.req.json();
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return c.json({ data: null, error: "OpenAI API key not configured" }, 500);
    }

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

    let parsedData;
    try {
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

app.get("/make-server-b70e7431/partners", async (c) => {
  try {
    const partners = await kv.get("partners") || [];
    return c.json({ data: partners, error: null });
  } catch (error) {
    console.log("Error fetching partners:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

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
    
    const existingFollow = follows.find(f => 
      f.followerId === currentPartnerId && f.followingId === partnerId
    );
    
    if (existingFollow) {
      console.log("Follow already exists:", existingFollow);
      return c.json({ data: existingFollow, error: null });
    }
    
    const reciprocalFollowIndex = follows.findIndex(f => 
      f.followerId === partnerId && f.followingId === currentPartnerId
    );
    
    const newFollow = {
      id: `follow_${Date.now()}`,
      followerId: currentPartnerId,
      followingId: partnerId,
      createdAt: new Date().toISOString(),
      status: 'accepted'
    };
    
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

// 全データリセットAPI（危険操作）
app.post("/make-server-b70e7431/reset-all-data", async (c) => {
  try {
    console.log('Resetting all data in KV store...');
    
    const dataKeys = [
      'partners', 'follows', 'partnerProjects', 'partnerTalents',
      'projects', 'talents', 'matches', 'shares'
    ];
    
    for (const key of dataKeys) {
      await kv.set(key, []);
      console.log(`Reset ${key} to empty array`);
    }
    
    console.log('All data has been reset to empty arrays');
    
    return c.json({ 
      data: { 
        success: true,
        message: "All data has been reset successfully",
        resetKeys: dataKeys
      }, 
      error: null 
    });
  } catch (error) {
    console.error("Error resetting all data:", error);
    return c.json({ data: null, error: error.message }, 500);
  }
});

Deno.serve(app.fetch);