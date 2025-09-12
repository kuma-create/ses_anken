import { useState } from 'react'
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  FileText
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { EmptyState } from "./EmptyState"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatCurrency, formatDate, getWorkStyleLabel } from "../lib/utils"

export function TalentList() {
  const { talents, deleteTalent } = useAppStore()
  const { navigate } = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTalents = talents.filter(talent =>
    talent.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    talent.skills.some(skill => 
      skill.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    (talent.location && talent.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDeleteTalent = async (talentId: string, talentAlias: string) => {
    if (confirm(`「${talentAlias}」を削除しますか？この操作は取り消せません。`)) {
      await deleteTalent(talentId)
    }
  }

  if (talents.length === 0) {
    return (
      <div>
        <SectionHeader
          title="人材"
          description="人材情報を管理します"
          actionLabel="新規登録"
          onAction={() => navigate('/talents/new')}
        />
        <EmptyState
          icon={Plus}
          title="人材が登録されていません"
          description="最初の人材を登録して、マッチングを始めましょう"
          actionLabel="人材登録"
          onAction={() => navigate('/talents/new')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="人材"
        description="人材情報を管理します"
        actionLabel="新規登録"
        onAction={() => navigate('/talents/new')}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="人材名やスキルで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </SectionHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>人材名</TableHead>
                <TableHead>スキル</TableHead>
                <TableHead>希望単価</TableHead>
                <TableHead>稼働開始</TableHead>
                <TableHead>希望勤務</TableHead>
                <TableHead>所在地</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTalents.map((talent) => (
                <TableRow 
                  key={talent.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/talents/${talent.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span>{talent.alias}</span>
                          {talent.nameMasked ? (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Eye className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        {talent.summary && (
                          <div className="text-sm text-gray-600 truncate max-w-xs">
                            {talent.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {talent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                          {talent.yearsBySkill?.[skill] && (
                            <span className="ml-1 text-xs opacity-75">
                              {talent.yearsBySkill[skill]}年
                            </span>
                          )}
                        </Badge>
                      ))}
                      {talent.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{talent.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {talent.rateExpect ? (
                      <span>{formatCurrency(talent.rateExpect)}</span>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {talent.availabilityFrom ? formatDate(talent.availabilityFrom) : '即時'}
                  </TableCell>
                  <TableCell>
                    {talent.workStylePref ? (
                      <Badge variant="outline">
                        {getWorkStyleLabel(talent.workStylePref)}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {talent.location || '未設定'}
                  </TableCell>
                  <TableCell>
                    {formatDate(talent.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/talents/${talent.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          履歴書確認
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/share', { type: 'talent', id: talent.id })}>
                          <Eye className="w-4 h-4 mr-2" />
                          共有
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteTalent(talent.id, talent.alias)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}