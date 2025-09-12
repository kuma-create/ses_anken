import { useState } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Sparkles, Loader2 } from "lucide-react"
import { projectsApi } from "../lib/api"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { toast } from "sonner@2.0.3"

interface AIProjectGeneratorProps {
  trigger?: React.ReactNode
}

export function AIProjectGenerator({ trigger }: AIProjectGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [workStyle, setWorkStyle] = useState('')
  const { addProject } = useAppStore()
  const { navigate } = useRouter()

  const handleGenerate = async () => {
    if (!prompt.trim() && !category && !skillLevel && !workStyle) {
      toast.error('少なくとも一つの条件を入力してください')
      return
    }

    setIsGenerating(true)

    try {
      const result = await projectsApi.generateWithAI({
        prompt: prompt.trim() || undefined,
        category: category || undefined,
        skillLevel: skillLevel || undefined,
        workStyle: workStyle || undefined,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.data) {
        throw new Error('案件データの生成に失敗しました')
      }

      // 生成された案件をデータベースに保存
      const saveResult = await projectsApi.create(result.data)
      
      if (saveResult.error) {
        throw new Error(saveResult.error)
      }

      if (saveResult.data) {
        // ストアにも追加
        addProject(saveResult.data)
        
        toast.success('AI案件が生成されました！')
        setIsOpen(false)
        
        // 生成された案件の詳細ページに遷移
        navigate(`/projects/${saveResult.data.id}`)
      }

    } catch (error) {
      console.error('Error generating project:', error)
      toast.error(error instanceof Error ? error.message : '案件生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setPrompt('')
    setCategory('')
    setSkillLevel('')
    setWorkStyle('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) {
        resetForm()
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            AI案件生成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1E63F3]" />
            AI案件生成
          </DialogTitle>
          <DialogDescription>
            AIを使って現実的なB2B SES案件を自動生成します。条件を指定して理想的な案件を作成しましょう。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">案件の要望（自由記述）</Label>
            <Textarea
              id="prompt"
              placeholder="例：React + TypeScriptを使った ECサイトリニューアル案件で、フルリモート可能な中級〜上級者向けの案件を作成してください"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-sm text-gray-600">
              具体的な要望を記述すると、より精度の高い案件が生成されます
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリ</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="システム開発">システム開発</SelectItem>
                  <SelectItem value="Web開発">Web開発</SelectItem>
                  <SelectItem value="モバイルアプリ">モバイルアプリ</SelectItem>
                  <SelectItem value="AI・機械学習">AI・機械学習</SelectItem>
                  <SelectItem value="インフラ">インフラ</SelectItem>
                  <SelectItem value="データ分析">データ分析</SelectItem>
                  <SelectItem value="その他">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillLevel">スキルレベル</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="初級">初級（1-2年）</SelectItem>
                  <SelectItem value="中級">中級（3-5年）</SelectItem>
                  <SelectItem value="上級">上級（5年以上）</SelectItem>
                  <SelectItem value="エキスパート">エキスパート（10年以上）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workStyle">勤務形態</Label>
            <Select value={workStyle} onValueChange={setWorkStyle}>
              <SelectTrigger>
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">フルリモート</SelectItem>
                <SelectItem value="hybrid">ハイブリッド</SelectItem>
                <SelectItem value="onsite">出社メイン</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 生成のコツ</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 具体的な技術スタックを指定すると精度が向上します</li>
              <li>• 業界や業務領域を明記すると適切な案件が生成されます</li>
              <li>• 予算感や期間の希望があれば記載してください</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isGenerating}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                案件を生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}