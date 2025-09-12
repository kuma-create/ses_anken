import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Switch } from "./ui/switch"
import { Textarea } from "./ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./ui/table"
import { 
  Share2, 
  Link2, 
  Eye, 
  EyeOff, 
  Copy, 
  Download,
  Calendar,
  Shield,
  Users,
  FileText,
  Trash2,
  Plus,
  CheckCircle2
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { EmptyState } from "./EmptyState"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatDate } from "../lib/utils"

interface ShareItem {
  id: string
  type: 'project' | 'talent'
  itemId: string
  itemTitle: string
  recipientEmail: string
  recipientName?: string
  accessLevel: 'view' | 'comment' | 'edit'
  hasNDA: boolean
  ndaStatus: 'pending' | 'signed' | 'declined'
  shareUrl: string
  expiresAt?: string
  createdAt: string
  viewCount: number
  lastViewed?: string
}

export function ShareCenter() {
  const { projects, talents } = useAppStore()
  const { params } = useRouter()
  const [shareItems, setShareItems] = useState<ShareItem[]>([])

  const [isCreateShareOpen, setIsCreateShareOpen] = useState(false)
  const [newShare, setNewShare] = useState({
    type: 'project' as 'project' | 'talent',
    itemId: '',
    recipientEmail: '',
    recipientName: '',
    accessLevel: 'view' as 'view' | 'comment' | 'edit',
    hasNDA: true,
    expiresIn: '7' // days
  })

  // 現在の共有状況
  const activeShares = shareItems.filter(item => !item.expiresAt || new Date(item.expiresAt) > new Date())
  const expiredShares = shareItems.filter(item => item.expiresAt && new Date(item.expiresAt) <= new Date())
  const pendingNDAs = shareItems.filter(item => item.ndaStatus === 'pending')

  const createShare = () => {
    const newItem: ShareItem = {
      id: Date.now().toString(),
      type: newShare.type,
      itemId: newShare.itemId,
      itemTitle: newShare.type === 'project' 
        ? projects.find(p => p.id === newShare.itemId)?.title || ''
        : talents.find(t => t.id === newShare.itemId)?.alias || '',
      recipientEmail: newShare.recipientEmail,
      recipientName: newShare.recipientName,
      accessLevel: newShare.accessLevel,
      hasNDA: newShare.hasNDA,
      ndaStatus: newShare.hasNDA ? 'pending' : 'signed',
      shareUrl: `https://mc-partner.app/s/${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + parseInt(newShare.expiresIn) * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      viewCount: 0
    }

    setShareItems([...shareItems, newItem])
    setIsCreateShareOpen(false)
    setNewShare({
      type: 'project',
      itemId: '',
      recipientEmail: '',
      recipientName: '',
      accessLevel: 'view',
      hasNDA: true,
      expiresIn: '7'
    })
  }

  const copyShareUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    // Toast通知を表示（実装は省略）
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'view': return 'bg-blue-100 text-blue-800'
      case 'comment': return 'bg-green-100 text-green-800'
      case 'edit': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNDAStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'declined': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNDAStatusText = (status: string) => {
    switch (status) {
      case 'signed': return '署名済み'
      case 'pending': return '署名待ち'
      case 'declined': return '署名拒否'
      default: return '不明'
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="共有センター"
        description="案件・人材情報の安全な共有を管理します"
        actionLabel="新規共有"
        onAction={() => setIsCreateShareOpen(true)}
      />


      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">アクティブ共有</TabsTrigger>
          <TabsTrigger value="nda">NDA管理</TabsTrigger>
          <TabsTrigger value="expired">期限切れ</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>共有内容</TableHead>
                    <TableHead>共有先</TableHead>
                    <TableHead>アクセス権限</TableHead>
                    <TableHead>NDA状況</TableHead>
                    <TableHead>閲覧数</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeShares.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'project' ? '案件' : '人材'}
                          </Badge>
                          <span className="font-medium">{item.itemTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.recipientName || item.recipientEmail}</div>
                          {item.recipientName && (
                            <div className="text-sm text-gray-600">{item.recipientEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAccessLevelColor(item.accessLevel)}>
                          {item.accessLevel === 'view' ? '閲覧' :
                           item.accessLevel === 'comment' ? 'コメント' : '編集'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getNDAStatusColor(item.ndaStatus)}>
                          {getNDAStatusText(item.ndaStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.viewCount}回</TableCell>
                      <TableCell>
                        {item.expiresAt ? formatDate(item.expiresAt) : '無期限'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyShareUrl(item.shareUrl)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nda">
          <div className="space-y-4">
            {pendingNDAs.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium">{item.itemTitle}</h4>
                        <Badge className={getNDAStatusColor(item.ndaStatus)}>
                          {getNDAStatusText(item.ndaStatus)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        共有先: {item.recipientName || item.recipientEmail}
                      </div>
                      <div className="text-sm text-gray-600">
                        作成日: {formatDate(item.createdAt)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        NDA確認
                      </Button>
                      <Button size="sm" variant="outline">
                        リマインド送信
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {pendingNDAs.length === 0 && (
              <EmptyState
                icon={CheckCircle2}
                title="署名待ちのNDAはありません"
                description="すべてのNDAが適切に処理されています"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>共有内容</TableHead>
                    <TableHead>共有先</TableHead>
                    <TableHead>期限切れ日</TableHead>
                    <TableHead>閲覧数</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredShares.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {item.type === 'project' ? '案件' : '人材'}
                          </Badge>
                          <span className="font-medium">{item.itemTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.recipientName || item.recipientEmail}</TableCell>
                      <TableCell>{item.expiresAt ? formatDate(item.expiresAt) : '-'}</TableCell>
                      <TableCell>{item.viewCount}回</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            再共有
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新規共有作成ダイアログ */}
      <Dialog open={isCreateShareOpen} onOpenChange={setIsCreateShareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新規共有作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">共有タイプ</label>
                <Select value={newShare.type} onValueChange={(value: 'project' | 'talent') => setNewShare({...newShare, type: value, itemId: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">案件</SelectItem>
                    <SelectItem value="talent">人材</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {newShare.type === 'project' ? '案件選択' : '人材選択'}
                </label>
                <Select value={newShare.itemId} onValueChange={(value) => setNewShare({...newShare, itemId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {newShare.type === 'project' 
                      ? projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                        ))
                      : talents.map(talent => (
                          <SelectItem key={talent.id} value={talent.id}>{talent.alias}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">共有先メールアドレス</label>
                <Input
                  type="email"
                  value={newShare.recipientEmail}
                  onChange={(e) => setNewShare({...newShare, recipientEmail: e.target.value})}
                  placeholder="example@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">担当者名（任意）</label>
                <Input
                  value={newShare.recipientName}
                  onChange={(e) => setNewShare({...newShare, recipientName: e.target.value})}
                  placeholder="田中様"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">アクセス権限</label>
                <Select value={newShare.accessLevel} onValueChange={(value: 'view' | 'comment' | 'edit') => setNewShare({...newShare, accessLevel: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">閲覧のみ</SelectItem>
                    <SelectItem value="comment">コメント可</SelectItem>
                    <SelectItem value="edit">編集可</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">有効期限</label>
                <Select value={newShare.expiresIn} onValueChange={(value) => setNewShare({...newShare, expiresIn: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1日</SelectItem>
                    <SelectItem value="3">3日</SelectItem>
                    <SelectItem value="7">7日</SelectItem>
                    <SelectItem value="14">14日</SelectItem>
                    <SelectItem value="30">30日</SelectItem>
                    <SelectItem value="0">無期限</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={newShare.hasNDA}
                onCheckedChange={(checked) => setNewShare({...newShare, hasNDA: checked})}
              />
              <div>
                <div className="font-medium">NDA署名を必須とする</div>
                <div className="text-sm text-gray-600">
                  共有先に秘密保持契約への署名を求めます
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateShareOpen(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={createShare}
                disabled={!newShare.itemId || !newShare.recipientEmail}
                className="bg-[#1E63F3] hover:bg-[#1E63F3]/90"
              >
                共有リンク作成
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}