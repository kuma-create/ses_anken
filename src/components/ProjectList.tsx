import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
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
  GitMerge,
  Share2,
  Edit,
  Trash2,
  Sparkles
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { EmptyState } from "./EmptyState"
import { AIProjectGenerator } from "./AIProjectGenerator"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatCurrency, formatDate, getWorkStyleLabel } from "../lib/utils"

export function ProjectList() {
  const { projects, deleteProject } = useAppStore()
  const { navigate } = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  // 使用言語（年数）を languageYears または language から配列化
  const toSkillsWithYears = (languageYears?: string, language?: string) => {
    const src = languageYears || language || "";
    return src
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.mustSkills.some(skill => 
      skill.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    if (confirm(`「${projectTitle}」を削除しますか？この操作は取り消せません。`)) {
      await deleteProject(projectId)
    }
  }

  if (projects.length === 0) {
    return (
      <div>
        <SectionHeader
          title="案件"
          description="案件情報を管理します"
          actionLabel="新規案件"
          onAction={() => navigate('/projects/new')}
        >
          <AIProjectGenerator 
            trigger={
              <Button variant="outline" className="gap-2 mr-2">
                <Sparkles className="w-4 h-4" />
                AI案件生成
              </Button>
            }
          />
        </SectionHeader>
        <EmptyState
          icon={Plus}
          title="案件がありません"
          description="最初の案件を作成して、マッチングを始めましょう"
          actionLabel="新規案件作成"
          onAction={() => navigate('/projects/new')}
        >
          <div className="mt-4">
            <AIProjectGenerator 
              trigger={
                <Button variant="outline" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI案件生成で始める
                </Button>
              }
            />
          </div>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="案件"
        description="案件情報を管理します"
        actionLabel="新規案件"
        onAction={() => navigate('/projects/new')}
      >
        <div className="flex items-center gap-3">
          <AIProjectGenerator 
            trigger={
              <Button variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI案件生成
              </Button>
            }
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="案件名やスキルで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </SectionHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>案件名</TableHead>
                <TableHead>必須スキル</TableHead>
                <TableHead>予算</TableHead>
                <TableHead>開始予定</TableHead>
                <TableHead>勤務形態</TableHead>
                <TableHead>商流</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow 
                  key={project.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{project.title}</div>
                      {project.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">
                          {project.description}
                        </div>
                      )}
                      {(() => {
                        const skillsWithYears = toSkillsWithYears(project.languageYears as any, project.language as any);
                        return skillsWithYears.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {skillsWithYears.slice(0, 4).map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px]">
                                {s}
                              </Badge>
                            ))}
                            {skillsWithYears.length > 4 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{skillsWithYears.length - 4}
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {project.mustSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {project.mustSkills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.mustSkills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.budgetMin && project.budgetMax ? (
                      <span>{formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}</span>
                    ) : project.budgetMin ? (
                      <span>{formatCurrency(project.budgetMin)}〜</span>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.startDate ? formatDate(project.startDate) : '未設定'}
                  </TableCell>
                  <TableCell>
                    {project.workStyle ? (
                      <Badge variant="outline">
                        {getWorkStyleLabel(project.workStyle)}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {project.commerceTier ? (
                      <Badge variant="outline">{project.commerceTier}</Badge>
                    ) : (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDate(project.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/matching', { projectId: project.id })}>
                          <GitMerge className="w-4 h-4 mr-2" />
                          マッチング
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/share', { type: 'project', id: project.id })}>
                          <Share2 className="w-4 h-4 mr-2" />
                          共有
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteProject(project.id, project.title)}
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