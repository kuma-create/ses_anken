import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Clock,
  TrendingUp
} from "lucide-react"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatCurrency, formatDate, getWorkStyleLabel } from "../lib/utils"
import { ScoreBadge } from "./ScoreBadge"

interface TalentDetailProps {
  talentId: string
}

export function TalentDetail({ talentId }: TalentDetailProps) {
  const { talents, matches, projects, updateTalent } = useAppStore()
  const { navigate } = useRouter()
  const [isAnonymous, setIsAnonymous] = useState(false)

  const talent = talents.find(t => t.id === talentId)
  const talentMatches = matches.filter(m => m.talentId === talentId)
  
  const matchesWithProjects = talentMatches.map(match => {
    const project = projects.find(p => p.id === match.projectId)
    return { match, project }
  }).filter(item => item.project)

  if (!talent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">人材が見つかりません</h3>
          <Button onClick={() => navigate('/talents')}>
            人材一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  const toggleAnonymous = (checked: boolean) => {
    setIsAnonymous(checked)
    updateTalent(talent.id, { nameMasked: checked })
  }

  // 最近の履歴（モック）
  const recentHistory = [
    {
      id: '1',
      type: 'proposal',
      projectTitle: 'ECサイトリニューアル',
      date: '2024-01-20',
      status: 'pending'
    },
    {
      id: '2',
      type: 'interview',
      projectTitle: 'モバイルアプリ開発',
      date: '2024-01-18',
      status: 'completed'
    },
    {
      id: '3',
      type: 'proposal',
      projectTitle: 'バックエンドAPI構築',
      date: '2024-01-15',
      status: 'rejected'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '保留中'
      case 'completed': return '完了'
      case 'rejected': return '見送り'
      default: return '不明'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/talents')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {isAnonymous ? '匿名ユーザー' : talent.alias}
            </h1>
            {talent.nameMasked ? (
              <EyeOff className="w-5 h-5 text-gray-400" />
            ) : (
              <Eye className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            登録日: {formatDate(talent.createdAt)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">匿名表示</span>
            <Switch
              checked={isAnonymous}
              onCheckedChange={toggleAnonymous}
            />
          </div>
          <Button variant="outline" onClick={() => navigate(`/talents/${talent.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            編集
          </Button>
          <Button variant="outline" onClick={() => navigate('/share', { type: 'talent', id: talent.id })}>
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
            {talent.summary && (
              <div>
                <h4 className="font-medium mb-2">職務要約</h4>
                <p className="text-sm text-gray-700">{talent.summary}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {talent.age && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">年齢</div>
                    <div className="text-sm text-gray-600">{talent.age}歳</div>
                  </div>
                </div>
              )}
              
              {talent.gender && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">性別</div>
                    <div className="text-sm text-gray-600">{talent.gender}</div>
                  </div>
                </div>
              )}
              
              {talent.nationality && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">国籍</div>
                    <div className="text-sm text-gray-600">{talent.nationality}</div>
                  </div>
                </div>
              )}
              
              {talent.affiliation && (
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">所属</div>
                    <div className="text-sm text-gray-600">{talent.affiliation}</div>
                  </div>
                </div>
              )}
              
              {talent.nearestStation && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">最寄駅</div>
                    <div className="text-sm text-gray-600">{talent.nearestStation}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">稼働開始予定</div>
                  <div className="text-sm text-gray-600">
                    {talent.availabilityFrom ? formatDate(talent.availabilityFrom) : '即時可能'}
                  </div>
                </div>
              </div>
              
              {talent.weeklyWorkDays && (
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 mt-0.5 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">週稼働</div>
                    <div className="text-sm text-gray-600">{talent.weeklyWorkDays}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">希望単価</div>
                  <div className="text-sm text-gray-600">
                    {talent.rateExpect ? formatCurrency(talent.rateExpect) : '要相談'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">所在地・希望勤務</div>
                  <div className="text-sm text-gray-600">
                    {talent.location || '未設定'}
                    {talent.workStylePref && (
                      <span className="ml-2">
                        ({getWorkStyleLabel(talent.workStylePref)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 mt-0.5 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">言語</div>
                  <div className="text-sm text-gray-600">
                    {talent.language || '未設定'}
                  </div>
                </div>
              </div>
            </div>

            {(talent.requiredConditions || talent.ngConditions) && (
              <div className="space-y-3">
                {talent.requiredConditions && (
                  <div>
                    <h4 className="font-medium mb-2">必須条件</h4>
                    <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                      {talent.requiredConditions}
                    </p>
                  </div>
                )}
                
                {talent.ngConditions && (
                  <div>
                    <h4 className="font-medium mb-2">NG条件</h4>
                    <p className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg">
                      {talent.ngConditions}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="font-medium mb-3">スキル・経験年数</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {talent.skills.map((skill) => (
                  <div key={skill} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{skill}</span>
                    <Badge variant="outline">
                      {talent.yearsBySkill?.[skill] || 0}年
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 統計情報 */}
        <Card>
          <CardHeader>
            <CardTitle>マッチング統計</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1E63F3]">{talentMatches.length}</div>
              <div className="text-sm text-gray-600">総マッチング数</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">A評価</span>
                <span className="font-medium text-blue-600">
                  {talentMatches.filter(m => m.decision === 'A').length}件
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">B評価</span>
                <span className="font-medium text-amber-600">
                  {talentMatches.filter(m => m.decision === 'B').length}件
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">C評価</span>
                <span className="font-medium text-gray-600">
                  {talentMatches.filter(m => m.decision === 'C').length}件
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>平均スコア</span>
              </div>
              <div className="text-xl font-bold text-[#1E63F3]">
                {talentMatches.length > 0 
                  ? Math.round(talentMatches.reduce((sum, m) => sum + m.scoreTotal, 0) / talentMatches.length)
                  : 0
                }点
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提案・面談履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>マッチング履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="matches" className="w-full">
            <TabsList>
              <TabsTrigger value="matches">マッチング結果</TabsTrigger>
              <TabsTrigger value="history">提案・面談履歴</TabsTrigger>
            </TabsList>
            
            <TabsContent value="matches" className="space-y-4 mt-6">
              {matchesWithProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  マッチング結果がありません
                </div>
              ) : (
                matchesWithProjects.map(({ match, project }) => (
                  <div key={match.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{project?.title}</h4>
                          <ScoreBadge decision={match.decision} score={match.scoreTotal} />
                          <Badge variant="outline" className="text-xs">
                            {formatDate(match.createdAt)}
                          </Badge>
                        </div>
                        
                        {project?.mustSkills && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {project.mustSkills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-600">
                          スコア詳細: 
                          スキル適合 {match.subScores?.skillMatch || 0}点, 
                          予算適合 {match.subScores?.budgetFit || 0}点, 
                          時期適合 {match.subScores?.availabilityAlign || 0}点
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/projects/${project?.id}`)}
                      >
                        案件詳細
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4 mt-6">
              {recentHistory.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{item.projectTitle}</h4>
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusText(item.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(item.date)}</span>
                        <span>•</span>
                        <span>
                          {item.type === 'proposal' ? '提案' : '面談'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}