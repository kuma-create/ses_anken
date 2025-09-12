import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"
import { 
  Users, 
  Building, 
  Briefcase, 
  UserCheck, 
  TrendingUp,
  Calendar,
  Activity,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Ban,
  UserPlus
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { useAppStore } from "../lib/store"
import { formatDate, formatCurrency } from "../lib/utils"
import { User, Company, AdminStats } from "../lib/types"

export function Admin() {
  const { projects, talents, partners } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [userFilter, setUserFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  // モックデータ（実際の実装ではAPIから取得）
  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'admin@mc-partner.com',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      lastLoginAt: '2024-01-20T10:30:00Z'
    },
    {
      id: '2',
      email: 'tanaka@tech-corp.jp',
      role: 'company',
      company: {
        id: 'c1',
        name: 'テックコーポレーション株式会社',
        type: 'client',
        contactPerson: '田中太郎',
        phone: '03-1234-5678',
        isVerified: true,
        status: 'active',
        createdAt: '2024-01-05T00:00:00Z'
      },
      createdAt: '2024-01-05T09:00:00Z',
      lastLoginAt: '2024-01-19T16:45:00Z'
    },
    {
      id: '3',
      email: 'yamada@ses-solutions.com',
      role: 'company',
      company: {
        id: 'c2',
        name: 'SESソリューションズ株式会社',
        type: 'agency',
        contactPerson: '山田花子',
        phone: '03-9876-5432',
        isVerified: true,
        status: 'active',
        createdAt: '2024-01-10T00:00:00Z'
      },
      createdAt: '2024-01-10T14:20:00Z',
      lastLoginAt: '2024-01-20T09:15:00Z'
    },
    {
      id: '4',
      email: 'suzuki@freelance.com',
      role: 'company',
      company: {
        id: 'c3',
        name: '鈴木デザイン事務所',
        type: 'freelancer',
        contactPerson: '鈴木一郎',
        isVerified: false,
        status: 'pending',
        createdAt: '2024-01-18T00:00:00Z'
      },
      createdAt: '2024-01-18T11:30:00Z'
    }
  ])

  const [companies] = useState<Company[]>([
    {
      id: 'c1',
      name: 'テックコーポレーション株式会社',
      type: 'client',
      contactPerson: '田中太郎',
      phone: '03-1234-5678',
      address: '東京都渋谷区',
      website: 'https://tech-corp.jp',
      employeeCount: '100-500名',
      isVerified: true,
      status: 'active',
      createdAt: '2024-01-05T00:00:00Z'
    },
    {
      id: 'c2',
      name: 'SESソリューションズ株式会社',
      type: 'agency',
      contactPerson: '山田花子',
      phone: '03-9876-5432',
      address: '東京都新宿区',
      website: 'https://ses-solutions.com',
      employeeCount: '50-100名',
      isVerified: true,
      status: 'active',
      createdAt: '2024-01-10T00:00:00Z'
    },
    {
      id: 'c3',
      name: '鈴木デザイン事務所',
      type: 'freelancer',
      contactPerson: '鈴木一郎',
      isVerified: false,
      status: 'pending',
      createdAt: '2024-01-18T00:00:00Z'
    }
  ])

  // 統計データ計算
  const stats: AdminStats = useMemo(() => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    return {
      totalUsers: users.length,
      totalCompanies: companies.length,
      totalProjects: projects.length,
      totalTalents: talents.length,
      totalMatches: 0, // マッチング数
      activeUsers: users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
      newUsersThisMonth: users.filter(u => new Date(u.createdAt) >= thisMonth).length,
      projectsThisMonth: projects.filter(p => new Date(p.createdAt) >= thisMonth).length,
      talentsThisMonth: talents.filter(t => new Date(t.createdAt) >= thisMonth).length,
      matchesThisMonth: 0
    }
  }, [users, companies, projects, talents])

  // フィルタリング
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = userFilter === 'all' || 
                         (userFilter === 'admin' && user.role === 'admin') ||
                         (userFilter === 'company' && user.role === 'company') ||
                         (userFilter === 'verified' && user.company?.isVerified) ||
                         (userFilter === 'unverified' && !user.company?.isVerified)
    return matchesSearch && matchesFilter
  })

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = companyFilter === 'all' || 
                         company.type === companyFilter ||
                         (companyFilter === 'verified' && company.isVerified) ||
                         (companyFilter === 'unverified' && !company.isVerified) ||
                         (companyFilter === 'active' && company.status === 'active') ||
                         (companyFilter === 'pending' && company.status === 'pending')
    return matchesSearch && matchesFilter
  })

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者'
      case 'company': return '企業ユーザー'
      case 'user': return '一般ユーザー'
      default: return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'company': return 'bg-blue-100 text-blue-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'クライアント'
      case 'agency': return 'SES・人材紹介'
      case 'freelancer': return 'フリーランス'
      default: return type
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'アクティブ'
      case 'inactive': return '非アクティブ'
      case 'pending': return '承認待ち'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="管理者ダッシュボード"
        description="システム全体の管理と監視を行います"
      />

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">総ユーザー数</div>
                <div className="text-xs text-green-600">+{stats.newUsersThisMonth} 今月</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.totalCompanies}</div>
                <div className="text-sm text-gray-600">登録企業数</div>
                <div className="text-xs text-blue-600">{companies.filter(c => c.isVerified).length} 認証済み</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.totalProjects}</div>
                <div className="text-sm text-gray-600">総案件数</div>
                <div className="text-xs text-green-600">+{stats.projectsThisMonth} 今月</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.totalTalents}</div>
                <div className="text-sm text-gray-600">登録人材数</div>
                <div className="text-xs text-green-600">+{stats.talentsThisMonth} 今月</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          <TabsTrigger value="companies">企業管理</TabsTrigger>
          <TabsTrigger value="content">コンテンツ管理</TabsTrigger>
          <TabsTrigger value="system">システム設定</TabsTrigger>
        </TabsList>

        {/* 概要タブ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>アクティビティ</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">今週のアクティブユーザー</span>
                    <span className="font-semibold">{stats.activeUsers}人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">今月の新規登録</span>
                    <span className="font-semibold">{stats.newUsersThisMonth}件</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">今月の新規案件</span>
                    <span className="font-semibold">{stats.projectsThisMonth}件</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">認証待ち企業</span>
                    <span className="font-semibold text-amber-600">
                      {companies.filter(c => !c.isVerified).length}社
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>成長指標</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>ユーザー増加率 (月次)</span>
                      <span className="text-green-600">+15%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '15%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>案件投稿率 (月次)</span>
                      <span className="text-blue-600">+23%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '23%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>マッチング成功率</span>
                      <span className="text-purple-600">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '78%'}}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ユーザー管理タブ */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ユーザーを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="company">企業</SelectItem>
                  <SelectItem value="verified">認証済み</SelectItem>
                  <SelectItem value="unverified">未認証</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
              <UserPlus className="w-4 h-4 mr-2" />
              新規ユーザー追加
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>役割</TableHead>
                    <TableHead>企業</TableHead>
                    <TableHead>認証状況</TableHead>
                    <TableHead>最終ログイン</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.email}</div>
                            <div className="text-sm text-gray-600">
                              {user.company?.contactPerson || '-'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.company ? (
                          <div>
                            <div className="font-medium">{user.company.name}</div>
                            <div className="text-sm text-gray-600">
                              {getCompanyTypeLabel(user.company.type)}
                            </div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {user.company ? (
                          <div className="flex items-center space-x-2">
                            {user.company.isVerified ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                            <span className="text-sm">
                              {user.company.isVerified ? '認証済み' : '認証待ち'}
                            </span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : '未ログイン'}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Ban className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ユーザーを停止しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  このユーザーのアカウントを停止します。停止されたユーザーはログインできなくなります。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  停止する
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 企業管理タブ */}
        <TabsContent value="companies" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="企業を検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="client">クライアント</SelectItem>
                  <SelectItem value="agency">SES・人材紹介</SelectItem>
                  <SelectItem value="freelancer">フリーランス</SelectItem>
                  <SelectItem value="verified">認証済み</SelectItem>
                  <SelectItem value="unverified">未認証</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="pending">承認待ち</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>企業名</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>連絡先</TableHead>
                    <TableHead>認証状況</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          {company.website && (
                            <div className="text-sm text-blue-600">
                              <a href={company.website} target="_blank" rel="noopener noreferrer">
                                {company.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCompanyTypeLabel(company.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.contactPerson}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {company.phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="w-3 h-3" />
                              <span>{company.phone}</span>
                            </div>
                          )}
                          {company.address && (
                            <div className="text-sm text-gray-600">{company.address}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {company.isVerified ? (
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Shield className="w-4 h-4 text-amber-600" />
                          )}
                          <span className="text-sm">
                            {company.isVerified ? '認証済み' : '未認証'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(company.status)}>
                          {getStatusLabel(company.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(company.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                          {!company.isVerified && (
                            <Button size="sm" variant="outline" className="text-green-600">
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Mail className="w-3 h-3" />
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

        {/* コンテンツ管理タブ */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>案件管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">総案件数</span>
                    <span className="font-semibold">{projects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">アクティブ案件</span>
                    <span className="font-semibold">{projects.length}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    案件一覧を見る
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>人材管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">総人材数</span>
                    <span className="font-semibold">{talents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">利用可能人材</span>
                    <span className="font-semibold">{talents.length}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    人材一覧を見る
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>パートナー管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">総パートナー数</span>
                    <span className="font-semibold">{partners.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">アクティブ</span>
                    <span className="font-semibold">{partners.filter(p => p.status === 'active').length}</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    パートナー一覧を見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* システム設定タブ */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>システム設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>新規登録の自動承認</Label>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <span className="text-sm text-gray-600">企業アカウントの自動承認を有効にする</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>メール通知</Label>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <span className="text-sm text-gray-600">システムイベントのメール通知を有効にする</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>API制限</Label>
                  <Input placeholder="1000" />
                  <span className="text-xs text-gray-600">1時間あたりのAPI呼び出し制限</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>セキュリティ設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>パスワードポリシー</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox defaultChecked />
                      <span className="text-sm">8文字以上</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox defaultChecked />
                      <span className="text-sm">大文字・小文字を含む</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <span className="text-sm">数字を含む</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <span className="text-sm">特殊文字を含む</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>セッション有効期限</Label>
                  <Select defaultValue="24h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1時間</SelectItem>
                      <SelectItem value="8h">8時間</SelectItem>
                      <SelectItem value="24h">24時間</SelectItem>
                      <SelectItem value="7d">7日間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}