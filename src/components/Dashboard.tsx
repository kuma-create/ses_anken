import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { ArrowUpRight, TrendingUp, Users, Briefcase, CheckCircle, XCircle, Plus, UserPlus, Sparkles } from "lucide-react"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { ScoreBadge } from "./ScoreBadge"
import { AIProjectGenerator } from "./AIProjectGenerator"

export function Dashboard() {
  const { projects, talents, matches, shares, partners } = useAppStore()
  const { navigate } = useRouter()

  // KPIデータを計算
  const thisMonthMatches = matches.filter(m => {
    const matchDate = new Date(m.createdAt)
    const now = new Date()
    return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear()
  })

  const proposedCount = thisMonthMatches.filter(m => m.stage === 'proposed').length
  const interviewCount = thisMonthMatches.filter(m => m.stage === 'interview').length
  const wonCount = thisMonthMatches.filter(m => m.stage === 'won').length
  const lostCount = thisMonthMatches.filter(m => m.stage === 'lost').length

  // AI仕分け結果サマリ
  const aCount = matches.filter(m => m.decision === 'A').length
  const bCount = matches.filter(m => m.decision === 'B').length
  const cCount = matches.filter(m => m.decision === 'C').length

  // 決まりやすい組合せTOP10（スコア順）
  const topMatches = matches
    .sort((a, b) => b.scoreTotal - a.scoreTotal)
    .slice(0, 10)
    .map(match => {
      const project = projects.find(p => p.id === match.projectId)
      const talent = talents.find(t => t.id === match.talentId)
      return { match, project, talent }
    })
    .filter(item => item.project && item.talent)

  // 未対応共有（最近の共有で、まだ未処理のもの）
  const recentShares = shares
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(share => {
      const sender = partners.find(p => p.email === share.recipientEmail) // 仮の実装
      if (share.shareType === 'project') {
        const project = projects.find(p => p.id === share.projectId)
        return {
          id: share.id,
          senderName: sender?.name || '不明なパートナー',
          content: project?.title || '案件名不明',
          type: 'project' as const,
          createdAt: share.createdAt
        }
      } else {
        const talent = talents.find(t => t.id === share.talentId)
        return {
          id: share.id,
          senderName: sender?.name || '不明なパートナー',
          content: talent?.alias || '人材名不明',
          type: 'talent' as const,
          createdAt: share.createdAt
        }
      }
    })
    .filter(Boolean)

  // 時間の相対表示
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return '1時間以内'
    if (diffInHours < 24) return `${diffInHours}時間前`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}日前`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-600 mt-1">今月の実績と推奨アクションをご確認ください</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の提案数</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1E63F3]">{proposedCount}</div>
            <p className="text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 inline mr-1" />
              先月比 +12%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">面談数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1E63F3]">{interviewCount}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              先月比 +8%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成約数</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{wonCount}</div>
            <p className="text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 inline mr-1" />
              先月比 +15%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">見送り数</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lostCount}</div>
            <p className="text-xs text-muted-foreground">
              先月比 -5%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#1E63F3]" />
            クイックアクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-3 p-6"
              onClick={() => navigate('/projects/new')}
            >
              <Plus className="h-8 w-8 text-[#1E63F3]" />
              <div className="text-center">
                <div className="font-medium">新規案件登録</div>
                <div className="text-xs text-gray-600">手動で案件を作成</div>
              </div>
            </Button>
            
            <AIProjectGenerator 
              trigger={
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-3 p-6 w-full"
                >
                  <Sparkles className="h-8 w-8 text-[#1E63F3]" />
                  <div className="text-center">
                    <div className="font-medium">AI案件生成</div>
                    <div className="text-xs text-gray-600">AIで自動作成・詳細項目込み</div>
                  </div>
                </Button>
              }
            />
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-3 p-6"
              onClick={() => navigate('/talents/new')}
            >
              <UserPlus className="h-8 w-8 text-[#1E63F3]" />
              <div className="text-center">
                <div className="font-medium">新規人材登録</div>
                <div className="text-xs text-gray-600">人材情報を登録</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI仕分け結果サマリ */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI仕分け結果サマリ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-blue-500 text-white">A - 推奨</Badge>
                    <span className="font-semibold">{aCount}件</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">すぐに提案を開始することをお勧めします</p>
                </div>
                <Button size="sm" className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                  一括提案
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-amber-500 text-white">B - 検討</Badge>
                    <span className="font-semibold">{bCount}件</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">条件調整後の提案を検討してください</p>
                </div>
                <Button variant="outline" size="sm">
                  詳細確認
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-gray-500 text-white">C - 見送り</Badge>
                    <span className="font-semibold">{cCount}件</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">現在の条件では適合度が低いです</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 未対応共有 */}
        <Card>
          <CardHeader>
            <CardTitle>未対応共有</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentShares.length > 0 ? (
                recentShares.map((share) => (
                  <div key={share.id} className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">{share.senderName}</div>
                    <div className="text-xs text-gray-600">
                      {share.type === 'project' ? '案件' : '人材'}の共有: {share.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{getTimeAgo(share.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">
                  未対応の共有はありません
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              size="sm"
              onClick={() => navigate('/share')}
            >
              すべて確認
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 決まりやすい組合せTOP10 */}
      <Card>
        <CardHeader>
          <CardTitle>決まりやすい組合せTOP10</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topMatches.map(({ match, project, talent }, index) => (
              <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-6 h-6 bg-[#1E63F3] text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{project?.title}</div>
                    <div className="text-xs text-gray-600">× {talent?.alias}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ScoreBadge decision={match.decision} score={match.scoreTotal} />
                  <Button size="sm" className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                    提案
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}