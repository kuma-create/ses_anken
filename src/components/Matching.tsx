import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { 
  Zap,
  Send,
  Calendar,
  MapPin,
  DollarSign,
  Star,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { ScoreBadge } from "./ScoreBadge"
import { ReasonPill } from "./ReasonPill"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatCurrency, formatDate, getWorkStyleLabel } from "../lib/utils"
import { Match, Talent } from "../lib/types"

export function Matching() {
  const { projects, talents, matches, addMatch, updateMatch } = useAppStore()
  const { params } = useRouter()
  const [selectedProjectId, setSelectedProjectId] = useState<string>(params.projectId || projects[0]?.id || '')
  const [proposalText, setProposalText] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<{ match: Match; talent: Talent } | null>(null)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const projectMatches = matches.filter(m => m.projectId === selectedProjectId)
  
  const matchesWithTalents = useMemo(() => {
    return projectMatches.map(match => {
      const talent = talents.find(t => t.id === match.talentId)
      return { match, talent }
    }).filter(item => item.talent) as { match: Match; talent: Talent }[]
  }, [projectMatches, talents])

  const aMatches = matchesWithTalents.filter(({ match }) => match.decision === 'A')
  const bMatches = matchesWithTalents.filter(({ match }) => match.decision === 'B')
  const cMatches = matchesWithTalents.filter(({ match }) => match.decision === 'C')

  const runAIMatching = async () => {
    if (!selectedProject) return

    setIsGeneratingAI(true)
    
    // モックAIマッチング処理
    setTimeout(() => {
      const availableTalents = talents.filter(t => 
        !projectMatches.some(m => m.talentId === t.id)
      )
      
      // 複数の候補者を生成
      availableTalents.slice(0, 3).forEach(talent => {
        const score = Math.floor(Math.random() * 40) + 60
        const decision = score >= 85 ? 'A' : score >= 70 ? 'B' : 'C'
        
        const newMatch: Match = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          projectId: selectedProject.id,
          talentId: talent.id,
          scoreTotal: score,
          decision,
          stage: 'draft',
          subScores: {
            skillMatch: Math.floor(Math.random() * 30) + 70,
            budgetFit: Math.floor(Math.random() * 30) + 70,
            availabilityAlign: Math.floor(Math.random() * 30) + 70
          },
          reasons: generateReasons(selectedProject, talent, score),
          createdAt: new Date().toISOString()
        }
        
        addMatch(newMatch)
      })
      
      setIsGeneratingAI(false)
    }, 2000)
  }

  const generateReasons = (project: any, talent: Talent, score: number): string[] => {
    const reasons = []
    
    // スキルマッチング
    const matchingSkills = project.mustSkills.filter((skill: string) => 
      talent.skills.includes(skill)
    )
    if (matchingSkills.length > 0) {
      reasons.push(`必須スキル適合: ${matchingSkills.join(', ')}`)
    }
    
    // 予算適合性
    if (talent.rateExpect && project.budgetMax && talent.rateExpect <= project.budgetMax) {
      reasons.push('希望単価が予算範囲内')
    } else if (talent.rateExpect && project.budgetMax && talent.rateExpect > project.budgetMax) {
      reasons.push('希望単価が予算上限超過')
    }
    
    // 勤務形態
    if (project.workStyle === talent.workStylePref) {
      reasons.push('勤務形態が希望と一致')
    }
    
    // 開始時期
    if (project.startDate && talent.availabilityFrom) {
      const projectStart = new Date(project.startDate)
      const talentAvailable = new Date(talent.availabilityFrom)
      if (talentAvailable <= projectStart) {
        reasons.push('開始時期に対応可能')
      }
    }
    
    return reasons.slice(0, 3)
  }

  const generateProposal = (match: Match, talent: Talent) => {
    if (!selectedProject) return

    const template = `
【案件提案】${selectedProject.title}

${talent.alias}様

お疲れ様です。
下記の案件についてご提案させていただきます。

■案件概要
・案件名: ${selectedProject.title}
・必須スキル: ${selectedProject.mustSkills.join(', ')}
・予算: ${selectedProject.budgetMin && selectedProject.budgetMax ? 
  `${formatCurrency(selectedProject.budgetMin)} - ${formatCurrency(selectedProject.budgetMax)}` : 
  '要相談'
}
・開始時期: ${selectedProject.startDate ? formatDate(selectedProject.startDate) : '要相談'}
・勤務形態: ${selectedProject.workStyle ? getWorkStyleLabel(selectedProject.workStyle) : '要相談'}

■マッチング理由
${match.reasons?.map(reason => `・${reason}`).join('\n') || ''}

ご興味をお持ちいただけましたら、詳細についてお話しさせていただければと思います。

ご検討のほど、よろしくお願いいたします。
    `.trim()

    setProposalText(template)
    setSelectedMatch({ match, talent })
  }

  const sendProposal = () => {
    if (!selectedMatch) return

    updateMatch(selectedMatch.match.id, { 
      stage: 'proposed',
      createdAt: new Date().toISOString()
    })
    
    setProposalText('')
    setSelectedMatch(null)
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">案件を選択してください</h3>
          <p className="text-sm text-gray-600">マッチングを開始するには案件を選択する必要があります</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="マッチング"
        description="案件に適した人材を見つけてマッチングを行います"
      >
        <Button
          onClick={runAIMatching}
          disabled={isGeneratingAI}
          className="bg-[#1E63F3] hover:bg-[#1E63F3]/90"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isGeneratingAI ? 'AI分析中...' : 'AIマッチング実行'}
        </Button>
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 案件選択・要件概要 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>案件選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="案件を選択" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-3 pt-4 border-t">
              <div>
                <h4 className="font-medium text-sm mb-2">必須スキル</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedProject.mustSkills.map((skill) => (
                    <Badge key={skill} className="bg-red-100 text-red-800 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedProject.budgetMin && (
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>{formatCurrency(selectedProject.budgetMin)} - {formatCurrency(selectedProject.budgetMax || selectedProject.budgetMin)}</span>
                </div>
              )}

              {selectedProject.startDate && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(selectedProject.startDate)}</span>
                </div>
              )}

              {selectedProject.workStyle && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{getWorkStyleLabel(selectedProject.workStyle)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 候補者リスト */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>候補者リスト</span>
              <div className="text-sm text-muted-foreground">
                総計 {matchesWithTalents.length}名
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="A" className="w-full">
              <div className="px-6 border-b">
                <TabsList className="h-12 p-1 bg-gray-50/50 grid w-full grid-cols-3">
                  <TabsTrigger 
                    value="A" 
                    className="flex items-center justify-center space-x-2 h-10 rounded-md data-[state=active]:bg-[#1E63F3] data-[state=active]:text-white"
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1E63F3] text-white flex items-center justify-center text-xs font-medium">
                        A
                      </div>
                      <span className="text-sm">推奨</span>
                      <span className="text-xs bg-gray-600/20 px-1.5 py-0.5 rounded">
                        {aMatches.length}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="B" 
                    className="flex items-center justify-center space-x-2 h-10 rounded-md data-[state=active]:bg-amber-500 data-[state=active]:text-white"
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-medium">
                        B
                      </div>
                      <span className="text-sm">検討</span>
                      <span className="text-xs bg-gray-600/20 px-1.5 py-0.5 rounded">
                        {bMatches.length}
                      </span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="C" 
                    className="flex items-center justify-center space-x-2 h-10 rounded-md data-[state=active]:bg-gray-500 data-[state=active]:text-white"
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-medium">
                        C
                      </div>
                      <span className="text-sm">見送り</span>
                      <span className="text-xs bg-gray-600/20 px-1.5 py-0.5 rounded">
                        {cMatches.length}
                      </span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="A" className="space-y-3 mt-0 p-6">
                {aMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#1E63F3]/10 flex items-center justify-center mb-4">
                      <Star className="w-8 h-8 text-[#1E63F3]" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">A評価の候補者はまだありません</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      AIマッチング実行ボタンを押して、条件に適合する人材を探してみましょう
                    </p>
                  </div>
                ) : (
                  aMatches.map(({ match, talent }) => (
                    <CandidateCard
                      key={match.id}
                      match={match}
                      talent={talent}
                      project={selectedProject}
                      onGenerateProposal={() => generateProposal(match, talent)}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="B" className="space-y-3 mt-0 p-6">
                {bMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">B評価の候補者はまだありません</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      検討対象となる候補者が見つかると、ここに表示されます
                    </p>
                  </div>
                ) : (
                  bMatches.map(({ match, talent }) => (
                    <CandidateCard
                      key={match.id}
                      match={match}
                      talent={talent}
                      project={selectedProject}
                      onGenerateProposal={() => generateProposal(match, talent)}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="C" className="space-y-3 mt-0 p-6">
                {cMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">C評価の候補者はまだありません</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      条件に合わない候補者がいる場合、ここに表示されます
                    </p>
                  </div>
                ) : (
                  cMatches.map(({ match, talent }) => (
                    <CandidateCard
                      key={match.id}
                      match={match}
                      talent={talent}
                      project={selectedProject}
                      onGenerateProposal={() => generateProposal(match, talent)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 提案ドラフトモーダル */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>提案ドラフト - {selectedMatch?.talent.alias}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedMatch(null)}>
                キャンセル
              </Button>
              <Button onClick={sendProposal} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                <Send className="w-4 h-4 mr-2" />
                提案送信
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CandidateCard({ 
  match, 
  talent, 
  project, 
  onGenerateProposal 
}: { 
  match: Match
  talent: Talent
  project: any
  onGenerateProposal: () => void
}) {
  const { navigate } = useRouter()

  // 単価・開始日の差分計算
  const rateDiff = talent.rateExpect && project.budgetMax ? 
    talent.rateExpect - project.budgetMax : null

  const getAvailabilityStatus = () => {
    if (!project.startDate || !talent.availabilityFrom) return null
    
    const projectStart = new Date(project.startDate)
    const talentAvailable = new Date(talent.availabilityFrom)
    const daysDiff = Math.ceil((talentAvailable.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= 0) return { status: 'good', text: '対応可能' }
    if (daysDiff <= 7) return { status: 'warning', text: `${daysDiff}日遅れ` }
    return { status: 'bad', text: `${daysDiff}日遅れ` }
  }

  const availabilityStatus = getAvailabilityStatus()

  return (
    <div className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <h4 className="font-semibold text-gray-900">{talent.alias}</h4>
            <ScoreBadge decision={match.decision} score={match.scoreTotal} />
            <Badge variant="outline" className="text-xs font-medium">
              {match.stage === 'draft' ? '下書き' :
               match.stage === 'proposed' ? '提案済み' :
               match.stage === 'interview' ? '面談中' :
               match.stage === 'won' ? '成約' :
               match.stage === 'lost' ? '失注' : '見送り'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">スキル</div>
              <div className="flex flex-wrap gap-1.5">
                {talent.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-medium">
                    {skill}
                    {talent.yearsBySkill?.[skill] && (
                      <span className="ml-1 opacity-75">{talent.yearsBySkill[skill]}年</span>
                    )}
                  </Badge>
                ))}
                {talent.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{talent.skills.length - 3}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">希望単価</div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {talent.rateExpect ? formatCurrency(talent.rateExpect) : '要相談'}
                </span>
                {rateDiff && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium ${
                      rateDiff > 0 ? 'border-red-200 text-red-700 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'
                    }`}
                  >
                    {rateDiff > 0 ? '+' : ''}{formatCurrency(rateDiff)}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">稼働開始</div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {talent.availabilityFrom ? formatDate(talent.availabilityFrom) : '即時'}
                </span>
                {availabilityStatus && (
                  <div className="flex items-center space-x-1">
                    {availabilityStatus.status === 'good' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : availabilityStatus.status === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      availabilityStatus.status === 'good' ? 'text-green-600' :
                      availabilityStatus.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {availabilityStatus.text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
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
        
        <div className="flex flex-col space-y-2.5 ml-6">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/talents/${talent.id}`)}
            className="w-20 font-medium border-gray-300 hover:border-gray-400"
          >
            詳細
          </Button>
          <Button 
            size="sm"
            onClick={onGenerateProposal}
            className="w-20 bg-[#1E63F3] hover:bg-[#1E63F3]/90 font-medium shadow-sm"
          >
            提案
          </Button>
        </div>
      </div>
    </div>
  )
}