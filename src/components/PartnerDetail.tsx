import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { 
  Building, 
  MapPin,
  Globe,
  Mail,
  Phone,
  UserPlus,
  UserCheck,
  Clock,
  MessageCircle,
  Star,
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  ArrowLeft,
  ExternalLink,
  Tag
} from "lucide-react"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatDate, formatCurrency, getWorkStyleLabel } from "../lib/utils"
import { Partner } from "../lib/types"

interface PartnerDetailProps {
  partnerId: string
}

export function PartnerDetail({ partnerId }: PartnerDetailProps) {
  const { 
    partners, 
    projects,
    talents,
    followPartner, 
    unfollowPartner, 
    getFollowStatus,
    getSharedProjects,
    getSharedTalents,
    isLoading
  } = useAppStore()
  const { navigate } = useRouter()
  const [followingInProgress, setFollowingInProgress] = useState(false)

  const partner = (partners || []).find(p => p.id === partnerId)

  const followStatus = getFollowStatus(partnerId) || 'none'
  const isMutual = followStatus === 'mutual'

  // フォローボタンの状態
  const getFollowButtonProps = () => {
    switch (followStatus) {
      case 'none':
        return {
          icon: UserPlus,
          text: 'フォロー',
          variant: 'outline' as const,
          className: 'border-[#1E63F3] text-[#1E63F3] hover:bg-[#1E63F3] hover:text-white'
        }
      case 'following':
        return {
          icon: Clock,
          text: 'フォロー中',
          variant: 'outline' as const,
          className: 'border-amber-500 text-amber-600 hover:bg-amber-50'
        }
      case 'followed_by':
        return {
          icon: UserPlus,
          text: 'フォローバック',
          variant: 'default' as const,
          className: 'bg-[#1E63F3] hover:bg-[#1E63F3]/90 text-white'
        }
      case 'mutual':
        return {
          icon: UserCheck,
          text: '相互フォロー',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        }
      default:
        return {
          icon: UserPlus,
          text: 'フォロー',
          variant: 'outline' as const,
          className: 'border-[#1E63F3] text-[#1E63F3] hover:bg-[#1E63F3] hover:text-white'
        }
    }
  }

  const handleFollowAction = async () => {
    if (followingInProgress) return
    
    setFollowingInProgress(true)
    
    try {
      console.log(`Follow action for ${partnerId}: current status ${followStatus}`)
      
      if (followStatus === 'none' || followStatus === 'followed_by') {
        const result = await followPartner(partnerId)
        console.log('Follow result:', result)
      } else if (followStatus === 'following' || followStatus === 'mutual') {
        const result = await unfollowPartner(partnerId)
        console.log('Unfollow result:', result)
      }
      
      // 状態更新のために少し待つ
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error('Error handling follow action:', error)
    } finally {
      setFollowingInProgress(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'クライアント'
      case 'subcontractor': return '協力会社'
      case 'prime_contractor': return '元請け'
      default: return type
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '取引中'
      case 'inactive': return '休止中'
      case 'prospect': return '見込み'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'prospect': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-purple-100 text-purple-800'
      case 'subcontractor': return 'bg-orange-100 text-orange-800'
      case 'prime_contractor': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompanyInitials = (name: string) => {
    return name.split('').slice(0, 2).join('')
  }

  // 相互フォロー時のみ表示される案件・人材データ（モック）
  const partnerProjects = isMutual ? [
    {
      id: `${partnerId}-project-1`,
      title: 'ECサイトリニューアルプロジェクト',
      description: 'レスポンシブ対応とUI/UX改善を含む既存ECサイトの全面リニューアル。SEO対策とパフォーマンス最適化も実施。',
      status: '募集中',
      mustSkills: ['React', 'TypeScript', 'Next.js', 'CSS'],
      wantSkills: ['Tailwind CSS', 'Figma'],
      workStyle: 'hybrid',
      budgetMin: 800000,
      budgetMax: 1200000,
      startDate: '2024-02-01',
      endDate: '2024-05-31',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: `${partnerId}-project-2`,
      title: 'モバイルアプリ開発',
      description: 'iOS/Android対応のネイティブアプリ開発。Push通知、地図機能、決済機能を含む。',
      status: '開発中',
      mustSkills: ['React Native', 'TypeScript', 'Firebase'],
      wantSkills: ['Swift', 'Kotlin'],
      workStyle: 'remote',
      budgetMin: 1500000,
      budgetMax: 2000000,
      startDate: '2024-01-01',
      endDate: '2024-04-30',
      createdAt: '2023-12-10T14:30:00Z'
    }
  ] : []

  const partnerTalents = isMutual ? [
    {
      id: `${partnerId}-talent-1`,
      alias: '田中（React開発者）',
      skills: ['React', 'TypeScript', 'Next.js', 'Node.js'],
      experience: '5年',
      workStyle: 'hybrid',
      availability: '稼働可能',
      rate: 800000,
      description: 'フロントエンド開発を中心に5年の経験。大規模なSPAの開発経験豊富。',
      createdAt: '2023-06-01T10:00:00Z'
    },
    {
      id: `${partnerId}-talent-2`,
      alias: '佐藤（UI/UXデザイナー）',
      skills: ['Figma', 'Adobe XD', 'Photoshop', 'ユーザーリサーチ'],
      experience: '3年',
      workStyle: 'remote',
      availability: '要相談',
      rate: 600000,
      description: 'ユーザーセントリックなデザインが得意。プロトタイプ作成からユーザーテストまで一貫して対応。',
      createdAt: '2023-07-15T15:20:00Z'
    }
  ] : []

  if (!partner) {
    return (
      <div className="text-center py-12">
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">企業が見つかりません</h3>
        <p className="text-sm text-gray-600">指定された企業は存在しないか、削除された可能性があります。</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate('/partners')}
        >
          取引先一覧に戻る
        </Button>
      </div>
    )
  }

  const followProps = getFollowButtonProps()
  const FollowIcon = followProps.icon

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/partners')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          取引先一覧に戻る
        </Button>
      </div>

      {/* 企業基本情報 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-[#1E63F3] text-white text-lg">
                  {getCompanyInitials(partner.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">{partner.name}</h1>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getTypeColor(partner.type)} variant="secondary">
                    {getTypeLabel(partner.type)}
                  </Badge>
                  <Badge className={getStatusColor(partner.status)} variant="secondary">
                    {getStatusLabel(partner.status)}
                  </Badge>
                  {isMutual && (
                    <Badge className="bg-green-100 text-green-800" variant="secondary">
                      相互フォロー
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{partner.address}</span>
                  </div>
                  {partner.website && (
                    <div className="flex items-center space-x-1">
                      <Globe className="w-4 h-4" />
                      <a 
                        href={partner.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#1E63F3] hover:underline flex items-center space-x-1"
                      >
                        <span>Webサイト</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {isMutual && (
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  チャットを開始
                </Button>
              )}
              <Button
                variant={followProps.variant}
                onClick={handleFollowAction}
                className={followProps.className}
                disabled={followingInProgress}
              >
                {followingInProgress ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border border-current border-r-transparent" />
                ) : (
                  <FollowIcon className="w-4 h-4 mr-2" />
                )}
                {followingInProgress ? '処理中...' : followProps.text}
              </Button>
            </div>
          </div>

          {/* 企業説明 */}
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{partner.description}</p>
          </div>

          {/* タグ */}
          {partner.tags && partner.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">専門分野・技術タグ</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {partner.tags.map((tag, index) => (
                  <Badge key={`${partner.id}-tag-${index}`} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Briefcase className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">案件数</span>
              </div>
              <div className="text-xl font-semibold">{partner.projectCount || 0}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">評価</span>
              </div>
              <div className="text-xl font-semibold">{partner.rating || 0}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">登録日</span>
              </div>
              <div className="text-sm font-semibold">{formatDate(partner.createdAt)}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">取引実績</span>
              </div>
              <div className="text-sm font-semibold">
                {partner.totalRevenue ? formatCurrency(partner.totalRevenue) : '非公開'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-gray-50">
          <TabsTrigger value="info" className="data-[state=active]:bg-white">
            会社情報
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-white">
            案件 ({partnerProjects.length})
          </TabsTrigger>
          <TabsTrigger value="talents" className="data-[state=active]:bg-white">
            人材 ({partnerTalents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>担当者・連絡先情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isMutual ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">相互フォローで詳細情報が表示されます</p>
                  <p className="text-sm text-gray-500">フォローして、この企業とのネットワークを構築しましょう</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">担当者名</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{partner.contactPerson}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <a 
                            href={`mailto:${partner.email}`}
                            className="text-[#1E63F3] hover:underline"
                          >
                            {partner.email}
                          </a>
                        </div>
                      </div>
                    </div>
                    {partner.phone && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">電話番号</label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <a 
                              href={`tel:${partner.phone}`}
                              className="text-[#1E63F3] hover:underline"
                            >
                              {partner.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">所在地</label>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{partner.address}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>案件情報</CardTitle>
            </CardHeader>
            <CardContent>
              {!isMutual ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">相互フォローで案件情報が表示されます</p>
                  <p className="text-sm text-gray-500">この企業の案件を確認するには、相互フォロー関係が必要です</p>
                </div>
              ) : partnerProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">現在、公開中の案件はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {partnerProjects.map((project) => (
                    <Card key={project.id} className="border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-lg mb-1">{project.title}</h4>
                            <Badge variant="outline" className="mb-2">
                              {project.status}
                            </Badge>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {project.budgetMin && project.budgetMax && (
                              <div>{formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}</div>
                            )}
                            {project.startDate && (
                              <div>{formatDate(project.startDate)} 開始予定</div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{project.description}</p>
                        
                        <div className="space-y-2 mb-3">
                          <div>
                            <span className="text-xs font-medium text-gray-600 mb-1 block">必須スキル</span>
                            <div className="flex flex-wrap gap-1">
                              {project.mustSkills.map((skill, index) => (
                                <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {project.wantSkills && project.wantSkills.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-600 mb-1 block">歓迎スキル</span>
                              <div className="flex flex-wrap gap-1">
                                {project.wantSkills.map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            勤務形態: {getWorkStyleLabel(project.workStyle)}
                          </div>
                          <div>
                            公開日: {formatDate(project.createdAt)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talents">
          <Card>
            <CardHeader>
              <CardTitle>人材情報</CardTitle>
            </CardHeader>
            <CardContent>
              {!isMutual ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">相互フォローで人材情報が表示されます</p>
                  <p className="text-sm text-gray-500">この企業の人材情報を確認するには、相互フォロー関係が必要です</p>
                </div>
              ) : partnerTalents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">現在、公開中の人材はいません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {partnerTalents.map((talent) => (
                    <Card key={talent.id} className="border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-lg mb-1">{talent.alias}</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span>経験: {talent.experience}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <Badge variant="outline" className="text-xs">
                                {talent.availability}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {talent.rate && (
                              <div className="font-medium">{formatCurrency(talent.rate)}/月</div>
                            )}
                            <div className="text-xs">{getWorkStyleLabel(talent.workStyle)}</div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{talent.description}</p>
                        
                        <div className="mb-3">
                          <span className="text-xs font-medium text-gray-600 mb-1 block">保有スキル</span>
                          <div className="flex flex-wrap gap-1">
                            {talent.skills.map((skill, index) => (
                              <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          登録日: {formatDate(talent.createdAt)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}