import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback } from "./ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { 
  Building, 
  Plus, 
  Search, 
  Users,
  Briefcase,
  Star,
  UserPlus,
  UserCheck,
  Clock,
  Eye,
  Network,
  MapPin,
  Mail,
  Phone
} from "lucide-react"
import { useAppStore } from "../lib/store"
import { useRouter } from "../lib/router"
import { formatDate } from "../lib/utils"
import { Partner } from "../lib/types"

export function Partners() {
  const { 
    partners, 
    followPartner, 
    unfollowPartner, 
    getFollowStatus, 
    getMutualPartners,
    getSharedProjects,
    getSharedTalents,
    isLoading
  } = useAppStore()
  const { navigate } = useRouter()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // 相互フォロー関連のデータ
  const mutualPartners = getMutualPartners() || []
  const sharedProjects = getSharedProjects() || []
  const sharedTalents = getSharedTalents() || []

  // フィルタリング - 重複を除去してからフィルタリング（実データのみ）
  const uniquePartners = new Map<string, Partner>()
  ;(partners || []).forEach((partner) => {
    uniquePartners.set(partner.id, partner)
  })
  const allPartners: Partner[] = Array.from(uniquePartners.values())
  const filteredPartners = allPartners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || partner.type === selectedType
    const matchesStatus = selectedStatus === 'all' || partner.status === selectedStatus
    
    return matchesSearch && matchesType && matchesStatus
  })

  // 統計計算
  const stats = {
    total: allPartners.length,
    active: allPartners.filter(p => p.status === 'active').length,
    mutual: mutualPartners.length,
    sharedProjects: sharedProjects.length,
    sharedTalents: sharedTalents.length,
    avgRating: allPartners.length > 0 ? allPartners.reduce((sum, p) => sum + (p.rating || 0), 0) / allPartners.length : 0
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

  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set())

  const handleFollowAction = async (partnerId: string) => {
    if (followingInProgress.has(partnerId)) return
    
    setFollowingInProgress(prev => new Set(prev).add(partnerId))
    
    try {
      const status = getFollowStatus(partnerId) || 'none'
      console.log(`Follow action for ${partnerId}: current status ${status}`)
      
      if (status === 'none' || status === 'followed_by') {
        const result = await followPartner(partnerId)
        console.log('Follow result:', result)
      } else if (status === 'following' || status === 'mutual') {
        const result = await unfollowPartner(partnerId)
        console.log('Unfollow result:', result)
      }
      
      // 状態更新のために少し待つ
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error('Error handling follow action:', error)
      // エラーハンドリング - 必要に応じてトースト通知など
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev)
        newSet.delete(partnerId)
        return newSet
      })
    }
  }

  const getFollowButtonProps = (partnerId: string) => {
    const status = getFollowStatus(partnerId) || 'none'
    
    switch (status) {
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

  const getCompanyInitials = (name: string) => {
    return name.split('').slice(0, 2).join('')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">取引先管理</h1>
          <p className="text-sm text-gray-600 mt-1">プラットフォーム参加企業との連携を管理します</p>
        </div>
      </div>

      {/* サマリーメトリクス */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.total}</div>
                <div className="text-sm text-gray-600">総取引先数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.active}</div>
                <div className="text-sm text-gray-600">取引中</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Network className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.mutual}</div>
                <div className="text-sm text-gray-600">相互フォロー</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.sharedProjects}</div>
                <div className="text-sm text-gray-600">共有案件</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.sharedTalents}</div>
                <div className="text-sm text-gray-600">共有人材</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">{stats.avgRating.toFixed(1)}</div>
                <div className="text-sm text-gray-600">平均評価</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="会社名・業界・技術で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="取引先タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのタイプ</SelectItem>
                <SelectItem value="client">クライアント</SelectItem>
                <SelectItem value="subcontractor">協力会社</SelectItem>
                <SelectItem value="prime_contractor">元請け</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="active">取引中</SelectItem>
                <SelectItem value="inactive">休止中</SelectItem>
                <SelectItem value="prospect">見込み</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 企業カード一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((partner) => {
          const followStatus = getFollowStatus(partner.id) || 'none'
          const followProps = getFollowButtonProps(partner.id)
          const FollowIcon = followProps.icon
          
          return (
            <Card key={partner.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                {/* ヘッダー部分 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-[#1E63F3] text-white text-sm">
                        {getCompanyInitials(partner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{partner.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getTypeColor(partner.type)} variant="secondary">
                          {getTypeLabel(partner.type)}
                        </Badge>
                        <Badge className={getStatusColor(partner.status)} variant="secondary">
                          {getStatusLabel(partner.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {followStatus === 'mutual' && (
                    <Badge className="bg-green-100 text-green-800" variant="secondary">
                      相互フォロー
                    </Badge>
                  )}
                </div>

                {/* 会社情報 */}
                <div className="space-y-2 mb-4">
                  {partner.lastProject && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">最新案件:</span> {partner.lastProject}
                    </div>
                  )}
                  {partner.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {partner.description}
                    </p>
                  )}
                  <div className="text-sm text-gray-600 flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{partner.address}</span>
                  </div>
                </div>

                {/* 担当者情報 */}
                <div className="space-y-1 mb-4">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">担当者:</span>{' '}
                    {followStatus === 'mutual' ? (
                      partner.contactPerson
                    ) : (
                      <span className="text-gray-400">相互フォローで表示</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center space-x-1">
                    <Mail className="w-3 h-3" />
                    {followStatus === 'mutual' ? (
                      <span>{partner.email}</span>
                    ) : (
                      <span className="text-gray-400">相互フォローで表示</span>
                    )}
                  </div>
                  {followStatus === 'mutual' && partner.phone && (
                    <div className="text-sm text-gray-600 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{partner.phone}</span>
                    </div>
                  )}
                </div>

                {/* タグ */}
                {partner.tags && partner.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {partner.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={`${partner.id}-tag-${index}`} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {partner.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{partner.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 統計情報 */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{partner.projectCount || 0}件</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span>{partner.rating || 0}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(partner.createdAt)}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/partners/${partner.id}`)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    詳細を見る
                  </Button>
                  <Button
                    size="sm"
                    variant={followProps.variant}
                    onClick={() => handleFollowAction(partner.id)}
                    className={followProps.className}
                    disabled={followingInProgress.has(partner.id)}
                  >
                    {followingInProgress.has(partner.id) ? (
                      <div className="w-3 h-3 mr-1 animate-spin rounded-full border border-current border-r-transparent" />
                    ) : (
                      <FollowIcon className="w-3 h-3 mr-1" />
                    )}
                    {followingInProgress.has(partner.id) ? '処理中...' : followProps.text}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 空状態 */}
      {filteredPartners.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">企業が見つかりません</h3>
          <p className="text-sm text-gray-600">検索条件を変更してお試しください。</p>
        </div>
      )}
    </div>
  )
}