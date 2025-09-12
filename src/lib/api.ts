import { projectId, publicAnonKey } from '../utils/supabase/info'
import { Partner, Project, Talent, Match, Share, Follow, PartnerProject, PartnerTalent } from './types'

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b70e7431`

interface ApiResponse<T> {
  data: T | null
  error: string | null
}

const apiCall = async function<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Partners API
export const partnersApi = {
  // 取引先一覧取得
  getAll: () => apiCall<Partner[]>('/partners'),
  
  // 新規取引先追加
  create: (partner: Omit<Partner, 'id' | 'projectCount' | 'totalRevenue' | 'createdAt'>) =>
    apiCall<Partner>('/partners', {
      method: 'POST',
      body: JSON.stringify(partner),
    }),
  
  // 取引先更新
  update: (id: string, partner: Partial<Partner>) =>
    apiCall<Partner>(`/partners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partner),
    }),
}

// Follows API
export const followsApi = {
  // フォロー一覧取得
  getAll: () => apiCall<Follow[]>('/follows'),
  
  // フォロー
  create: (partnerId: string) =>
    apiCall<Follow>('/follows', {
      method: 'POST',
      body: JSON.stringify({ partnerId }),
    }),
  
  // アンフォロー
  remove: (partnerId: string) =>
    apiCall<{ success: boolean }>(`/follows/${partnerId}`, {
      method: 'DELETE',
    }),
}

// Projects API
export const projectsApi = {
  // 案件一覧取得
  getAll: () => apiCall<Project[]>('/projects'),
  
  // 共有案件取得
  getShared: () => apiCall<PartnerProject[]>('/projects/shared'),
  
  // 新規案件追加
  create: (project: Omit<Project, 'id' | 'createdAt'>) =>
    apiCall<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    }),
  
  // 案件更新
  update: (id: string, project: Partial<Project>) =>
    apiCall<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    }),
  
  // 案件削除
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // AI案件生成
  generateWithAI: (options: {
    prompt?: string
    category?: string
    skillLevel?: string
    workStyle?: string
  }) =>
    apiCall<Omit<Project, 'id' | 'createdAt'>>('/c', {
      method: 'POST',
      body: JSON.stringify(options),
    }),
}

// Talents API
export const talentsApi = {
  // 人材一覧取得
  getAll: () => apiCall<Talent[]>('/talents'),
  
  // 共有人材取得
  getShared: () => apiCall<PartnerTalent[]>('/talents/shared'),
  
  // 新規人材追加
  create: (talent: Omit<Talent, 'id' | 'createdAt'>) =>
    apiCall<Talent>('/talents', {
      method: 'POST',
      body: JSON.stringify(talent),
    }),
  
  // 人材更新
  update: (id: string, talent: Partial<Talent>) =>
    apiCall<Talent>(`/talents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(talent),
    }),
  
  // 人材削除
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/talents/${id}`, {
      method: 'DELETE',
    }),
}

// Matches API
export const matchesApi = {
  // マッチング一覧取得
  getAll: () => apiCall<Match[]>('/matches'),
  
  // 新規マッチング追加
  create: (match: Omit<Match, 'id' | 'createdAt'>) =>
    apiCall<Match>('/matches', {
      method: 'POST',
      body: JSON.stringify(match),
    }),
  
  // マッチング更新
  update: (id: string, match: Partial<Match>) =>
    apiCall<Match>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(match),
    }),
}

// Shares API
export const sharesApi = {
  // 共有一覧取得
  getAll: () => apiCall<Share[]>('/shares'),
  
  // 新規共有追加
  create: (share: Omit<Share, 'id' | 'createdAt'>) =>
    apiCall<Share>('/shares', {
      method: 'POST',
      body: JSON.stringify(share),
    }),
}

// 初期データセットアップ
export const initializeData = () => apiCall<{ message: string }>('/init', { method: 'POST' })

// データベース初期化
export const initializeDatabase = () => 
  apiCall<{ 
    success: boolean
    message: string
    initialized: string[]
  }>('/init-database', { method: 'POST' })

// 全データリセット（危険操作）
export const resetAllData = () => 
  apiCall<{ 
    success: boolean
    message: string
    resetKeys: string[]
  }>('/reset-all-data', { method: 'POST' })

// 全データを一括取得する便利関数
export const fetchAllData = async () => {
  const [
    partnersResult,
    followsResult,
    projectsResult,
    talentsResult,
    matchesResult,
    sharesResult,
    sharedProjectsResult,
    sharedTalentsResult,
  ] = await Promise.all([
    partnersApi.getAll(),
    followsApi.getAll(),
    projectsApi.getAll(),
    talentsApi.getAll(),
    matchesApi.getAll(),
    sharesApi.getAll(),
    projectsApi.getShared(),
    talentsApi.getShared(),
  ])

  return {
    partners: partnersResult.data || [],
    follows: followsResult.data || [],
    projects: projectsResult.data || [],
    talents: talentsResult.data || [],
    matches: matchesResult.data || [],
    shares: sharesResult.data || [],
    partnerProjects: sharedProjectsResult.data || [],
    partnerTalents: sharedTalentsResult.data || [],
  }
}