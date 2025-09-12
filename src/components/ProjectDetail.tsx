import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  GitMerge, 
  Zap,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Building
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { ScoreBadge } from "./ScoreBadge"
import { ReasonPill } from "./ReasonPill"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatCurrency, formatDate, getWorkStyleLabel } from "../lib/utils"
import { Project, Match, Talent } from "../lib/types"

interface ProjectDetailProps {
  projectId: string
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { projects, matches, talents, addMatch } = useAppStore()
  const { navigate } = useRouter()
  const [isRunningAI, setIsRunningAI] = useState(false)

  const project = projects.find(p => p.id === projectId)
  const projectMatches = matches.filter(m => m.projectId === projectId)
  
  const matchesWithTalents = projectMatches.map(match => {
    const talent = talents.find(t => t.id === match.talentId)
    return { match, talent }
  }).filter(item => item.talent)

  const aMatches = matchesWithTalents.filter(({ match }) => match.decision === 'A')
  const bMatches = matchesWithTalents.filter(({ match }) => match.decision === 'B')
  const cMatches = matchesWithTalents.filter(({ match }) => match.decision === 'C')

  // 使用言語（年数）を languageYears または language から配列化
  const toSkillsWithYears = (languageYears?: string, language?: string) => {
    const src = languageYears || language || "";
    return src
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">案件が見つかりません</h3>
          <Button onClick={() => navigate('/projects')}>
            案件一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  const runAIScreening = async () => {
    setIsRunningAI(true)
    
    // モックAIスクリーニング（実際にはAPIを呼び出す）
    setTimeout(() => {
      // ランダムな候補者を追加（実際にはAIがスコアリング）
      const availableTalents = talents.filter(t => 
        !projectMatches.some(m => m.talentId === t.id)
      )
      
      if (availableTalents.length > 0) {
        const randomTalent = availableTalents[Math.floor(Math.random() * availableTalents.length)]
        const score = Math.floor(Math.random() * 40) + 60 // 60-100のスコア
        const decision = score >= 85 ? 'A' : score >= 70 ? 'B' : 'C'
        
        const newMatch: Match = {
          id: Date.now().toString(),
          projectId: project.id,
          talentId: randomTalent.id,
          scoreTotal: score,
          decision,
          stage: 'draft',
          subScores: {
            skillMatch: Math.floor(Math.random() * 30) + 70,
            budgetFit: Math.floor(Math.random() * 30) + 70,
            availabilityAlign: Math.floor(Math.random() * 30) + 70
          },
          reasons: [
            'スキルマッチング良好',
            '予算範囲内',
            '開始時期調整可能'
          ],
          createdAt: new Date().toISOString()
        }
        
        addMatch(newMatch)
      }
      
      setIsRunningAI(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/projects')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{project.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            作成日: {formatDate(project.createdAt)}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={runAIScreening}
            disabled={isRunningAI}
            className="bg-[#1E63F3] hover:bg-[#1E63F3]/90"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isRunningAI ? 'AI分析中...' : 'AIスクリーニング実行'}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            編集
          </Button>
          <Button variant="outline" onClick={() => navigate('/share', { type: 'project', id: project.id })}>
            <Share2 className="w-4 h-4 mr-2" />
            共有
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本情報 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <h4 className="font-medium mb-2">概要</h4>
                <p className="text-sm text-gray-700">{project.description}</p>
              </div>
            )}
            {(() => {
              const skillsWithYears = toSkillsWithYears(project.languageYears as any, project.language as any);
              return skillsWithYears.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2">使用言語（年数）</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsWithYears.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">開始予定</div>
                  <div className="text-sm text-gray-600">
                    {project.startDate ? formatDate(project.startDate) : '未設定'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">予算</div>
                  <div className="text-sm text-gray-600">
                    {project.budgetMin && project.budgetMax ? (
                      `${formatCurrency(project.budgetMin)} - ${formatCurrency(project.budgetMax)}`
                    ) : project.budgetMin ? (
                      `${formatCurrency(project.budgetMin)}〜`
                    ) : (
                      '未設定'
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">勤務地</div>
                  <div className="text-sm text-gray-600">
                    {project.location || '未設定'}
                    {project.workStyle && (
                      <span className="ml-2">
                        ({getWorkStyleLabel(project.workStyle)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">商流</div>
                  <div className="text-sm text-gray-600">
                    {project.commerceTier || '未設定'}
                    {project.commerceLimit && (
                      <span className="ml-2">({project.commerceLimit})</span>
                    )}
                  </div>
                </div>
              </div>

              {project.workingHours && (
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">勤務時間</div>
                    <div className="text-sm text-gray-600">{project.workingHours}</div>
                  </div>
                </div>
              )}

              {project.workingDays && (
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">稼働日数</div>
                    <div className="text-sm text-gray-600">{project.workingDays}</div>
                  </div>
                </div>
              )}

              {project.attendanceFrequency && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">出社頻度</div>
                    <div className="text-sm text-gray-600">{project.attendanceFrequency}</div>
                  </div>
                </div>
              )}

              {project.interviewCount && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">面談回数</div>
                    <div className="text-sm text-gray-600">{project.interviewCount}回</div>
                  </div>
                </div>
              )}

              {project.paymentRange && (
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">精算幅</div>
                    <div className="text-sm text-gray-600">{project.paymentRange}</div>
                  </div>
                </div>
              )}

              {project.paymentTerms && (
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">支払いサイト</div>
                    <div className="text-sm text-gray-600">{project.paymentTerms}</div>
                  </div>
                </div>
              )}

              {project.ageLimit && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">年齢制限</div>
                    <div className="text-sm text-gray-600">{project.ageLimit}歳まで</div>
                  </div>
                </div>
              )}

              {project.foreignerAcceptable !== undefined && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">外国籍</div>
                    <div className="text-sm text-gray-600">
                      {project.foreignerAcceptable ? '可能' : '不可'}
                    </div>
                  </div>
                </div>
              )}

              {project.pcProvided !== undefined && (
                <div className="flex items-start space-x-3">
                  <Building className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">PC貸与</div>
                    <div className="text-sm text-gray-600">
                      {project.pcProvided ? 'あり' : 'なし'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {project.detailedDescription && (
              <div>
                <h4 className="font-medium mb-2">業務内容（詳細）</h4>
                <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg whitespace-pre-wrap">
                  {project.detailedDescription}
                </p>
              </div>
            )}

            {project.recruitmentBackground && (
              <div>
                <h4 className="font-medium mb-2">募集背景</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {project.recruitmentBackground}
                </p>
              </div>
            )}

            {project.developmentEnvironment && (
              <div>
                <h4 className="font-medium mb-2">開発環境</h4>
                <p className="text-sm text-gray-700 bg-green-50 p-4 rounded-lg whitespace-pre-wrap">
                  {project.developmentEnvironment}
                </p>
              </div>
            )}

            {project.ngConditions && (
              <div>
                <h4 className="font-medium mb-2">NG条件</h4>
                <p className="text-sm text-gray-700 bg-red-50 p-4 rounded-lg whitespace-pre-wrap">
                  {project.ngConditions}
                </p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">必須スキル</h4>
              <div className="flex flex-wrap gap-2">
                {project.mustSkills.map((skill) => (
                  <Badge key={skill} className="bg-red-100 text-red-800">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {project.niceSkills && project.niceSkills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">歓迎スキル</h4>
                <div className="flex flex-wrap gap-2">
                  {project.niceSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="border-green-200 text-green-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 統計情報 */}
        <Card>
          <CardHeader>
            <CardTitle>マッチング統計</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1E63F3]">{projectMatches.length}</div>
              <div className="text-sm text-gray-600">総候補者数</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Badge className="bg-blue-500 text-white">A - 推奨</Badge>
                <span className="font-medium">{aMatches.length}件</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge className="bg-amber-500 text-white">B - 検討</Badge>
                <span className="font-medium">{bMatches.length}件</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge className="bg-gray-500 text-white">C - 見送り</Badge>
                <span className="font-medium">{cMatches.length}件</span>
              </div>
            </div>

            <Button 
              className="w-full bg-[#1E63F3] hover:bg-[#1E63F3]/90"
              onClick={() => navigate('/matching', { projectId: project.id })}
            >
              <GitMerge className="w-4 h-4 mr-2" />
              マッチング画面へ
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* マッチング結果 */}
      <Card>
        <CardHeader>
          <CardTitle>マッチング結果</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="A" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="A" className="flex items-center space-x-2">
                <Badge className="bg-blue-500 text-white text-xs">A</Badge>
                <span>推奨 ({aMatches.length})</span>
              </TabsTrigger>
              <TabsTrigger value="B" className="flex items-center space-x-2">
                <Badge className="bg-amber-500 text-white text-xs">B</Badge>
                <span>検討 ({bMatches.length})</span>
              </TabsTrigger>
              <TabsTrigger value="C" className="flex items-center space-x-2">
                <Badge className="bg-gray-500 text-white text-xs">C</Badge>
                <span>見送り ({cMatches.length})</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="A" className="space-y-4 mt-6">
              {aMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  A評価の候補者はまだありません
                </div>
              ) : (
                aMatches.map(({ match, talent }) => (
                  <MatchCard key={match.id} match={match} talent={talent!} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="B" className="space-y-4 mt-6">
              {bMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  B評価の候補者はまだありません
                </div>
              ) : (
                bMatches.map(({ match, talent }) => (
                  <MatchCard key={match.id} match={match} talent={talent!} />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="C" className="space-y-4 mt-6">
              {cMatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  C評価の候補者はまだありません
                </div>
              ) : (
                cMatches.map(({ match, talent }) => (
                  <MatchCard key={match.id} match={match} talent={talent!} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function MatchCard({ match, talent }: { match: Match; talent: Talent }) {
  const { navigate } = useRouter()
  
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-medium">{talent.alias}</h4>
            <ScoreBadge decision={match.decision} score={match.scoreTotal} />
            <Badge variant="outline" className="text-xs">
              {match.stage === 'draft' ? '下書き' :
               match.stage === 'proposed' ? '提案済み' :
               match.stage === 'interview' ? '面談中' :
               match.stage === 'won' ? '成約' :
               match.stage === 'lost' ? '失注' : '見送り'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {talent.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {match.reasons?.map((reason, index) => (
              <ReasonPill
                key={index}
                type="must"
                text={reason}
                isPositive={true}
              />
            ))}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/talents/${talent.id}`)}
          >
            詳細
          </Button>
          <Button 
            size="sm"
            className="bg-[#1E63F3] hover:bg-[#1E63F3]/90"
          >
            提案
          </Button>
        </div>
      </div>
    </div>
  )
}