import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon, Upload, X } from "lucide-react"
import { format } from "date-fns"
import { Talent, WorkStyle } from "../lib/types"
import { useRouter } from "../lib/router"
import { useAppStore } from "../lib/store"
import { PdfUploader } from "./PdfUploader"

interface TalentFormProps {
  talentId?: string
}

export function TalentForm({ talentId }: TalentFormProps) {
  const { navigate } = useRouter()
  const { talents, addTalent, updateTalent } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [showPdfUploader, setShowPdfUploader] = useState(false)
  
  const existingTalent = talentId ? talents.find(t => t.id === talentId) : null

  const [formData, setFormData] = useState({
    alias: '',
    nameMasked: true,
    age: '',
    gender: '',
    nationality: '',
    affiliation: '',
    nearestStation: '',
    weeklyWorkDays: '',
    role: '',
    skills: [] as string[],
    yearsBySkill: {} as Record<string, number>,
    rateExpect: '',
    location: '',
    availabilityFrom: undefined as Date | undefined,
    workStylePref: '' as WorkStyle | '',
    language: '',
    requiredConditions: '',
    ngConditions: '',
    summary: ''
  })

  useEffect(() => {
    if (existingTalent) {
      setFormData({
        alias: existingTalent.alias,
        nameMasked: existingTalent.nameMasked || false,
        age: existingTalent.age?.toString() || '',
        gender: existingTalent.gender || '',
        nationality: existingTalent.nationality || '',
        affiliation: existingTalent.affiliation || '',
        nearestStation: existingTalent.nearestStation || '',
        weeklyWorkDays: existingTalent.weeklyWorkDays || '',
        role: existingTalent.role || '',
        skills: existingTalent.skills,
        yearsBySkill: existingTalent.yearsBySkill || {},
        rateExpect: existingTalent.rateExpect?.toString() || '',
        location: existingTalent.location || '',
        availabilityFrom: existingTalent.availabilityFrom ? (() => {
          const date = new Date(existingTalent.availabilityFrom)
          return isNaN(date.getTime()) ? undefined : date
        })() : undefined,
        workStylePref: existingTalent.workStylePref || '',
        language: existingTalent.language || '',
        requiredConditions: existingTalent.requiredConditions || '',
        ngConditions: existingTalent.ngConditions || '',
        summary: existingTalent.summary || ''
      })
    }
  }, [existingTalent])

  const addSkill = () => {
    if (!skillInput.trim()) return
    
    const trimmedSkill = skillInput.trim()
    if (formData.skills.includes(trimmedSkill)) {
      alert('このスキルは既に追加されています')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      skills: [...prev.skills, trimmedSkill]
    }))
    setSkillInput('')
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
      yearsBySkill: Object.fromEntries(
        Object.entries(prev.yearsBySkill).filter(([skill]) => skill !== skillToRemove)
      )
    }))
  }

  const updateYearsBySkill = (skill: string, years: string) => {
    const yearNum = parseInt(years)
    if (isNaN(yearNum) || yearNum < 0) {
      setFormData(prev => ({
        ...prev,
        yearsBySkill: Object.fromEntries(
          Object.entries(prev.yearsBySkill).filter(([s]) => s !== skill)
        )
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        yearsBySkill: {
          ...prev.yearsBySkill,
          [skill]: yearNum
        }
      }))
    }
  }

  const handlePdfDataExtracted = (data: any) => {
    // ワークスタイルのマッピング
    const workStyleMap: Record<string, WorkStyle> = {
      'フルリモート': 'remote',
      'リモート': 'remote', 
      'remote': 'remote',
      'オンサイト': 'onsite', 
      'onsite': 'onsite',
      'ハイブリッド': 'hybrid',
      'hybrid': 'hybrid'
    }
    
    // スキル経験年数の処理
    let newYearsBySkill = { ...formData.yearsBySkill }
    // data.experienceがnullまたは0の場合は、年数を設定しない
    // 各スキルに対して個別の年数が指定されている場合のみ処理
    if (data.skillExperience && typeof data.skillExperience === 'object') {
      // 個別スキル年数が指定されている場合
      Object.entries(data.skillExperience).forEach(([skill, years]) => {
        if (typeof years === 'number' && years > 0) {
          newYearsBySkill[skill] = years
        }
      })
    }
    
    setFormData(prev => ({
      ...prev,
      alias: data.name || prev.alias,
      age: data.age?.toString() || prev.age,
      gender: data.gender || prev.gender,
      nationality: data.nationality || prev.nationality,
      affiliation: data.affiliation || prev.affiliation,
      nearestStation: data.nearestStation || prev.nearestStation,
      weeklyWorkDays: data.weeklyWorkDays || prev.weeklyWorkDays,
      role: data.role || data.title || prev.role,
      summary: data.description || prev.summary,
      skills: data.skills ? [...new Set([...prev.skills, ...data.skills])] : prev.skills,
      yearsBySkill: newYearsBySkill,
      rateExpect: data.hourlyRate ? data.hourlyRate.toString() : 
                  data.monthlyRate ? data.monthlyRate.toString() :
                  data.rateManYen ? data.rateManYen.toString() : prev.rateExpect,
      location: data.location || prev.location,
      availabilityFrom: data.availability ? (() => {
        const date = new Date(data.availability)
        return isNaN(date.getTime()) ? prev.availabilityFrom : date
      })() : prev.availabilityFrom,
      workStylePref: data.remote !== undefined ? (data.remote ? 'remote' : 'onsite') : 
                     data.workStyle ? workStyleMap[data.workStyle] || prev.workStylePref : prev.workStylePref,
      language: data.languages ? data.languages.join(', ') : prev.language,
      requiredConditions: data.requiredConditions || prev.requiredConditions,
      ngConditions: data.ngConditions || prev.ngConditions
    }))
    
    setShowPdfUploader(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.alias.trim()) {
      alert('氏名を入力してください')
      return
    }

    if (formData.skills.length === 0) {
      alert('スキルを少なくとも1つ追加してください')
      return
    }

    setIsSubmitting(true)

    try {
      const talentData = {
        alias: formData.alias.trim(),
        nameMasked: formData.nameMasked,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender.trim() || undefined,
        nationality: formData.nationality.trim() || undefined,
        affiliation: formData.affiliation.trim() || undefined,
        nearestStation: formData.nearestStation.trim() || undefined,
        weeklyWorkDays: formData.weeklyWorkDays.trim() || undefined,
        role: formData.role.trim() || undefined,
        skills: formData.skills,
        yearsBySkill: Object.keys(formData.yearsBySkill).length > 0 ? formData.yearsBySkill : undefined,
        rateExpect: formData.rateExpect ? parseInt(formData.rateExpect) : undefined,
        location: formData.location.trim() || undefined,
        availabilityFrom: formData.availabilityFrom ? formData.availabilityFrom.toISOString().split('T')[0] : undefined,
        workStylePref: formData.workStylePref || undefined,
        language: formData.language.trim() || undefined,
        requiredConditions: formData.requiredConditions.trim() || undefined,
        ngConditions: formData.ngConditions.trim() || undefined,
        summary: formData.summary.trim() || undefined
      }

      if (existingTalent) {
        await updateTalent(existingTalent.id, talentData)
      } else {
        await addTalent(talentData)
      }

      navigate('/talents')
    } catch (error) {
      console.error('Error saving talent:', error)
      alert('人材情報の保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>
            {existingTalent ? '人材情報編集' : '人材登録'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPdfUploader(true)}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              スキルシート（PDF）から自動入力
            </Button>
          </div>

          {showPdfUploader && (
            <div className="mb-6">
              <PdfUploader
                onDataExtracted={handlePdfDataExtracted}
                onClose={() => setShowPdfUploader(false)}
                extractionType="talent"
              />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="alias">氏名 *</Label>
                <Input
                  id="alias"
                  value={formData.alias}
                  onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="山田太郎 or エンジニアA等"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="nameMasked"
                  checked={formData.nameMasked}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, nameMasked: checked }))}
                />
                <Label htmlFor="nameMasked">氏名を非公開にする</Label>
              </div>

              <div>
                <Label htmlFor="age">年齢</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="45"
                />
              </div>

              <div>
                <Label htmlFor="gender">性別</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="性別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男性">男性</SelectItem>
                    <SelectItem value="女性">女性</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nationality">国籍</Label>
                <Select
                  value={formData.nationality}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, nationality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="国籍を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="日本">日本</SelectItem>
                    <SelectItem value="中国">中国</SelectItem>
                    <SelectItem value="韓国">韓国</SelectItem>
                    <SelectItem value="インド">インド</SelectItem>
                    <SelectItem value="ベトナム">ベトナム</SelectItem>
                    <SelectItem value="フィリピン">フィリピン</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="affiliation">所属</Label>
                <Input
                  id="affiliation"
                  value={formData.affiliation}
                  onChange={(e) => setFormData(prev => ({ ...prev, affiliation: e.target.value }))}
                  placeholder="弊社個人事業主"
                />
              </div>

              <div>
                <Label htmlFor="nearestStation">最寄駅</Label>
                <Input
                  id="nearestStation"
                  value={formData.nearestStation}
                  onChange={(e) => setFormData(prev => ({ ...prev, nearestStation: e.target.value }))}
                  placeholder="小田急線相模大野駅"
                />
              </div>

              <div>
                <Label htmlFor="weeklyWorkDays">週稼働</Label>
                <Select
                  value={formData.weeklyWorkDays}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, weeklyWorkDays: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="週稼働を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="週1">週1</SelectItem>
                    <SelectItem value="週2">週2</SelectItem>
                    <SelectItem value="週3">週3</SelectItem>
                    <SelectItem value="週4">週4</SelectItem>
                    <SelectItem value="週5">週5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role">役割・職種</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="フロントエンドテックリード／フルスタックエンジニア"
                />
              </div>

              <div className="md:col-span-2">
                <Label>スキル・経験年数 *</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="スキル名を入力"
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill}>追加</Button>
                </div>
                <div className="space-y-2">
                  {formData.skills.map((skill) => (
                    <div key={skill} className="flex items-center gap-2 p-2 border rounded">
                      <Badge variant="secondary" className="flex-shrink-0">{skill}</Badge>
                      <div className="flex items-center gap-2 flex-1">
                        <Label htmlFor={`years-${skill}`} className="text-sm">年数:</Label>
                        <Input
                          id={`years-${skill}`}
                          type="number"
                          min="0"
                          max="50"
                          value={formData.yearsBySkill[skill] || ''}
                          onChange={(e) => updateYearsBySkill(skill, e.target.value)}
                          placeholder="経験年数"
                          className="w-20"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill(skill)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="rateExpect">希望単価（万円/月）</Label>
                <Input
                  id="rateExpect"
                  type="number"
                  value={formData.rateExpect}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateExpect: e.target.value }))}
                  placeholder="120"
                />
              </div>

              <div>
                <Label htmlFor="location">希望勤務地</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="東京都渋谷区等"
                />
              </div>

              <div>
                <Label>稼働開始可能日</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.availabilityFrom && !isNaN(formData.availabilityFrom.getTime()) ? (
                        format(formData.availabilityFrom, "yyyy年MM月dd日")
                      ) : (
                        <span>日付を選択</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.availabilityFrom}
                      onSelect={(date) => setFormData(prev => ({ ...prev, availabilityFrom: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="workStylePref">希望働き方</Label>
                <Select
                  value={formData.workStylePref}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, workStylePref: value as WorkStyle }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="働き方を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onsite">オンサイト</SelectItem>
                    <SelectItem value="remote">リモート</SelectItem>
                    <SelectItem value="hybrid">ハイブリッド</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">得意言語</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  placeholder="日本語, 英語等"
                />
              </div>

              <div>
                <Label htmlFor="requiredConditions">必須条件</Label>
                <Input
                  id="requiredConditions"
                  value={formData.requiredConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiredConditions: e.target.value }))}
                  placeholder="フルリモート案件"
                />
              </div>

              <div>
                <Label htmlFor="ngConditions">NG条件</Label>
                <Input
                  id="ngConditions"
                  value={formData.ngConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, ngConditions: e.target.value }))}
                  placeholder="DMM"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="summary">人材サマリー</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="人材の特徴や経歴などを入力"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/talents')}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : existingTalent ? '更新' : '登録'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}