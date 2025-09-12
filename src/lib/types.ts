export type WorkStyle = 'onsite' | 'remote' | 'hybrid'
export type Decision = 'A' | 'B' | 'C'
export type Stage = 'draft' | 'proposed' | 'interview' | 'won' | 'lost' | 'no-go'

export type Project = {
  id: string
  title: string
  description?: string
  detailedDescription?: string // 業務内容の詳細
  recruitmentBackground?: string // 募集背景
  mustSkills: string[]
  niceSkills?: string[]
  budgetMin?: number
  budgetMax?: number
  workStyle?: WorkStyle
  startDate?: string
  language?: string
  commerceTier?: string // 商流
  commerceLimit?: string // 商流制限
  location?: string // 勤務地
  workingHours?: string // 勤務時間（フレックス情報など）
  workingDays?: string // 稼働日数
  attendanceFrequency?: string // 出社頻度
  interviewCount?: number // 面談回数
  paymentRange?: string // 精算幅
  pcProvided?: boolean // PC貸与
  paymentTerms?: string // 支払いサイト
  ageLimit?: number // 年齢制限
  foreignerAcceptable?: boolean // 外国籍可否
  ngConditions?: string // NG条件
  developmentEnvironment?: string // 開発環境
  createdAt: string
}

export type Talent = {
  id: string
  alias: string
  nameMasked?: boolean
  age?: number
  gender?: string
  nationality?: string
  affiliation?: string
  nearestStation?: string
  weeklyWorkDays?: string
  role?: string
  skills: string[]
  yearsBySkill?: Record<string, number>
  rateExpect?: number
  location?: string
  availabilityFrom?: string
  workStylePref?: WorkStyle
  language?: string
  requiredConditions?: string
  ngConditions?: string
  summary?: string
  createdAt: string
}

export type Match = {
  id: string
  projectId: string
  talentId: string
  scoreTotal: number
  decision: Decision
  stage: Stage
  subScores?: Record<string, number>
  reasons?: string[]
  createdAt: string
}

export type Partner = {
  id: string
  name: string
  type: 'client' | 'subcontractor' | 'prime_contractor'
  status: 'active' | 'inactive' | 'prospect'
  contactPerson: string
  email: string
  phone?: string
  address?: string
  website?: string
  description?: string
  rating: number
  projectCount: number
  totalRevenue: number
  lastProject?: string
  createdAt: string
  tags: string[]
}

export type FollowStatus = 'none' | 'following' | 'followed_by' | 'mutual'

export type Follow = {
  id: string
  followerId: string
  followingId: string
  createdAt: string
  status: 'pending' | 'accepted' | 'declined'
}

export type PartnerProject = {
  id: string
  partnerId: string
  title: string
  description?: string
  mustSkills: string[]
  budgetMin?: number
  budgetMax?: number
  workStyle?: WorkStyle
  startDate?: string
  isShared: boolean
  createdAt: string
}

export type PartnerTalent = {
  id: string
  partnerId: string
  alias: string
  skills: string[]
  yearsBySkill?: Record<string, number>
  rateExpected?: number
  location?: string
  availabilityFrom?: string
  workStylePref?: WorkStyle
  summary?: string
  isShared: boolean
  createdAt: string
}

export type Share = {
  id: string
  projectId?: string
  talentId?: string
  recipientEmail: string
  shareType: 'project' | 'talent'
  isAnonymous: boolean
  expiresAt: string
  createdAt: string
}

// 認証関連のタイプ定義
export type User = {
  id: string
  email: string
  role: 'admin' | 'company' | 'user'
  company?: Company
  profile?: UserProfile
  createdAt: string
  lastLoginAt?: string
}

export type Company = {
  id: string
  name: string
  type: 'client' | 'agency' | 'freelancer'
  website?: string
  address?: string
  contactPerson: string
  phone?: string
  employeeCount?: string
  description?: string
  isVerified: boolean
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
}

export type UserProfile = {
  id: string
  userId: string
  name: string
  position?: string
  department?: string
  phone?: string
  avatar?: string
  timezone?: string
  language: 'ja' | 'en'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  createdAt: string
}

export type AdminStats = {
  totalUsers: number
  totalCompanies: number
  totalProjects: number
  totalTalents: number
  totalMatches: number
  activeUsers: number
  newUsersThisMonth: number
  projectsThisMonth: number
  talentsThisMonth: number
  matchesThisMonth: number
}