import { create } from 'zustand'
import { Project, Talent, Match, Partner, Share, Follow, FollowStatus, PartnerProject, PartnerTalent, User, Company } from './types'
import { 
  partnersApi, 
  followsApi, 
  projectsApi, 
  talentsApi, 
  matchesApi, 
  sharesApi,
  fetchAllData,
  initializeData,
  initializeDatabase
} from './api'

interface AppState {
  // Data
  projects: Project[]
  talents: Talent[]
  matches: Match[]
  partners: Partner[]
  shares: Share[]
  follows: Follow[]
  partnerProjects: PartnerProject[]
  partnerTalents: PartnerTalent[]
  currentPartnerId: string // 現在のパートナーID（自分の会社）
  
  // Auth data
  user: User | null
  isAuthenticated: boolean
  
  // Loading states
  isLoading: boolean
  isInitialized: boolean
  
  // Core actions
  initializeApp: () => Promise<void>
  initializeDatabase: () => Promise<void>
  refreshData: () => Promise<void>
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; company: Omit<Company, 'id' | 'isVerified' | 'status' | 'createdAt'> }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>
  updateProject: (id: string, project: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  
  // Talent actions
  addTalent: (talent: Omit<Talent, 'id' | 'createdAt'>) => Promise<void>
  updateTalent: (id: string, talent: Partial<Talent>) => Promise<void>
  deleteTalent: (id: string) => Promise<void>
  
  // Match actions
  addMatch: (match: Omit<Match, 'id' | 'createdAt'>) => Promise<void>
  updateMatch: (id: string, match: Partial<Match>) => Promise<void>
  
  // Partner actions
  addPartner: (partner: Omit<Partner, 'id' | 'projectCount' | 'totalRevenue' | 'createdAt'>) => Promise<void>
  updatePartner: (id: string, partner: Partial<Partner>) => Promise<void>
  
  // Follow actions
  followPartner: (partnerId: string) => Promise<void>
  unfollowPartner: (partnerId: string) => Promise<void>
  
  // Share actions
  addShare: (share: Omit<Share, 'id' | 'createdAt'>) => Promise<void>
  
  // Getters
  getFollowStatus: (partnerId: string) => FollowStatus
  getMutualPartners: () => Partner[]
  getSharedProjects: () => PartnerProject[]
  getSharedTalents: () => PartnerTalent[]
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  projects: [],
  talents: [],
  matches: [],
  partners: [],
  shares: [],
  follows: [],
  partnerProjects: [],
  partnerTalents: [],
  currentPartnerId: 'current_company',
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  // Initialize app with data from API
  initializeApp: async () => {
    set({ isLoading: true })
    
    try {
      const state = get()
      const isNewUser = state.user && state.user.id && state.user.id.startsWith('user_')
      
      console.log('Initializing app for user:', state.user?.email, 'isNewUser:', isNewUser)
      
      // 全ユーザーに対して空のデータでスタート（モックデータなし）
      console.log('Starting with empty data for clean user experience')
      set({
        projects: [],
        talents: [],
        matches: [],
        partners: [],
        shares: [],
        follows: [],
        partnerProjects: [],
        partnerTalents: [],
        currentPartnerId: state.user?.company?.id || 'current_company',
        isLoading: false,
        isInitialized: true
      })
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
      set({ isLoading: false })
      
      // エラー時は空のデータで初期化
      set({
        partners: [],
        follows: [],
        projects: [],
        talents: [],
        matches: [],
        shares: [],
        partnerProjects: [],
        partnerTalents: [],
        isInitialized: true,
        isLoading: false,
      })
    }
  },

  // Initialize database tables
  initializeDatabase: async () => {
    set({ isLoading: true })
    
    try {
      console.log('Initializing empty data structures for new user...')
      
      // 新規ユーザーの場合は、空のデータ構造のみ初期化
      const result = await initializeDatabase()
      
      if (result.data?.success) {
        console.log('Empty data structure initialization completed successfully')
      } else {
        console.log('Data structure initialization completed (using existing structure)')
      }
      
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to initialize data structure:', error)
      set({ isLoading: false })
      // エラーでも続行できるようにする
      console.log('Continuing with empty data set')
    }
  },

  // Refresh all data
  refreshData: async () => {
    set({ isLoading: true })
    
    try {
      const data = await fetchAllData()
      set({ ...data, isLoading: false })
    } catch (error) {
      console.error('Failed to refresh data:', error)
      set({ isLoading: false })
    }
  },
  
  // Project actions
  addProject: async (projectData) => {
    try {
      const result = await projectsApi.create(projectData)
      if (result.data) {
        set((state) => ({ 
          projects: [...state.projects, result.data!] 
        }))
      }
    } catch (error) {
      console.error('Failed to add project:', error)
    }
  },
  
  updateProject: async (id, updatedProject) => {
    try {
      const result = await projectsApi.update(id, updatedProject)
      if (result.data) {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? result.data! : p
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update project:', error)
    }
  },
  
  deleteProject: async (id) => {
    try {
      const result = await projectsApi.delete(id)
      if (result.data?.success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }))
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  },
  
  // Talent actions
  addTalent: async (talentData) => {
    try {
      const result = await talentsApi.create(talentData)
      if (result.data) {
        set((state) => ({ 
          talents: [...state.talents, result.data!] 
        }))
      }
    } catch (error) {
      console.error('Failed to add talent:', error)
    }
  },
  
  updateTalent: async (id, updatedTalent) => {
    try {
      const result = await talentsApi.update(id, updatedTalent)
      if (result.data) {
        set((state) => ({
          talents: state.talents.map((t) =>
            t.id === id ? result.data! : t
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update talent:', error)
    }
  },
  
  deleteTalent: async (id) => {
    try {
      const result = await talentsApi.delete(id)
      if (result.data?.success) {
        set((state) => ({
          talents: state.talents.filter((t) => t.id !== id),
        }))
      }
    } catch (error) {
      console.error('Failed to delete talent:', error)
    }
  },
  
  // Match actions
  addMatch: async (matchData) => {
    try {
      const result = await matchesApi.create(matchData)
      if (result.data) {
        set((state) => ({ 
          matches: [...state.matches, result.data!] 
        }))
      }
    } catch (error) {
      console.error('Failed to add match:', error)
    }
  },
  
  updateMatch: async (id, updatedMatch) => {
    try {
      const result = await matchesApi.update(id, updatedMatch)
      if (result.data) {
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === id ? result.data! : m
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update match:', error)
    }
  },
  
  // Partner actions
  addPartner: async (partnerData) => {
    try {
      const result = await partnersApi.create(partnerData)
      if (result.data) {
        set((state) => ({ 
          partners: [...state.partners, result.data!] 
        }))
      }
    } catch (error) {
      console.error('Failed to add partner:', error)
    }
  },
  
  updatePartner: async (id, updatedPartner) => {
    try {
      const result = await partnersApi.update(id, updatedPartner)
      if (result.data) {
        set((state) => ({
          partners: state.partners.map((p) =>
            p.id === id ? result.data! : p
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update partner:', error)
    }
  },
  
  // Follow actions
  followPartner: async (partnerId) => {
    try {
      const result = await followsApi.create(partnerId)
      if (result.data) {
        set((state) => ({
          follows: [...state.follows, result.data!]
        }))
        console.log('Follow successful:', result.data)
        return result.data
      } else if (result.error) {
        console.error('Follow error:', result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to follow partner:', error)
      throw error
    }
  },

  unfollowPartner: async (partnerId) => {
    try {
      const result = await followsApi.remove(partnerId)
      if (result.data?.success) {
        set((state) => ({
          follows: state.follows.filter((f) => 
            !(f.followerId === state.currentPartnerId && f.followingId === partnerId) &&
            !(f.followerId === partnerId && f.followingId === state.currentPartnerId)
          )
        }))
        console.log('Unfollow successful')
        return true
      } else if (result.error) {
        console.error('Unfollow error:', result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to unfollow partner:', error)
      throw error
    }
  },

  // Share actions
  addShare: async (shareData) => {
    try {
      const result = await sharesApi.create(shareData)
      if (result.data) {
        set((state) => ({ 
          shares: [...state.shares, result.data!] 
        }))
      }
    } catch (error) {
      console.error('Failed to add share:', error)
    }
  },

  getFollowStatus: (partnerId) => {
    const state = get()
    const currentId = state.currentPartnerId
    
    const followingThem = state.follows.find(f => 
      f.followerId === currentId && f.followingId === partnerId && f.status === 'accepted'
    )
    const followedByThem = state.follows.find(f => 
      f.followerId === partnerId && f.followingId === currentId && f.status === 'accepted'
    )
    
    if (followingThem && followedByThem) return 'mutual'
    if (followingThem) return 'following'
    if (followedByThem) return 'followed_by'
    return 'none'
  },

  getMutualPartners: () => {
    const state = get()
    const currentId = state.currentPartnerId
    
    if (!state.follows || !state.partners) {
      return []
    }
    
    const mutualPartnerIds = state.follows
      .filter(f => f.status === 'accepted')
      .reduce((acc: string[], follow) => {
        const otherPartnerId = follow.followerId === currentId ? follow.followingId : follow.followerId
        if (otherPartnerId !== currentId) {
          const reciprocalFollow = state.follows.find(f => 
            f.followerId === otherPartnerId && 
            f.followingId === currentId && 
            f.status === 'accepted'
          )
          if (reciprocalFollow && !acc.includes(otherPartnerId)) {
            acc.push(otherPartnerId)
          }
        }
        return acc
      }, [])
    
    return state.partners.filter(p => mutualPartnerIds.includes(p.id)) || []
  },

  getSharedProjects: () => {
    const state = get()
    if (!state.partnerProjects) {
      return []
    }
    
    const mutualPartners = get().getMutualPartners() || []
    const mutualPartnerIds = mutualPartners.map(p => p.id)
    
    return state.partnerProjects.filter(pp => 
      mutualPartnerIds.includes(pp.partnerId) && pp.isShared
    ) || []
  },

  getSharedTalents: () => {
    const state = get()
    if (!state.partnerTalents) {
      return []
    }
    
    const mutualPartners = get().getMutualPartners() || []
    const mutualPartnerIds = mutualPartners.map(p => p.id)
    
    return state.partnerTalents.filter(pt => 
      mutualPartnerIds.includes(pt.partnerId) && pt.isShared
    ) || []
  },

  // Auth actions
  login: async (email: string, password: string) => {
    set({ isLoading: true })
    
    try {
      // モック認証処理（実際の実装ではSupabase Auth APIを使用）
      await new Promise(resolve => setTimeout(resolve, 1000)) // API呼び出しをシミュレート
      
      // モックユーザーデータ
      const mockUser: User = {
        id: '1',
        email,
        role: email === 'admin@mc-partner.com' ? 'admin' : 'company',
        company: email !== 'admin@mc-partner.com' ? {
          id: 'c1',
          name: 'テックコーポレーション株式会社',
          type: 'client',
          contactPerson: '田中太郎',
          phone: '03-1234-5678',
          isVerified: true,
          status: 'active',
          createdAt: new Date().toISOString()
        } : undefined,
        createdAt: '2024-01-01T00:00:00Z',
        lastLoginAt: new Date().toISOString()
      }
      
      set({ 
        user: mockUser, 
        isAuthenticated: true, 
        isLoading: false 
      })
      
      // ローカルストレージに認証情報を保存
      localStorage.setItem('mcpartner_auth', JSON.stringify({
        user: mockUser,
        timestamp: Date.now()
      }))
      
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (data: { email: string; password: string; company: Omit<Company, 'id' | 'isVerified' | 'status' | 'createdAt'> }) => {
    console.log('Store: Starting registration...', data.email)
    set({ isLoading: true })
    
    try {
      // バリデーション
      if (!data.email || !data.password || !data.company.name || !data.company.contactPerson) {
        throw new Error('必須項目が不足しています')
      }

      // モック登録処理（実際の実装ではSupabase Auth APIを使用）
      console.log('Store: Simulating API call...')
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 既存ユーザーのチェック（モック）
          const existingAuth = localStorage.getItem('mcpartner_auth')
          if (existingAuth) {
            const { user } = JSON.parse(existingAuth)
            if (user.email === data.email) {
              reject(new Error('このメールアドレスは既に使用されています'))
              return
            }
          }
          resolve(true)
        }, 1000)
      })
      
      console.log('Store: Creating user data...')
      const newCompany: Company = {
        ...data.company,
        id: `company_${Date.now()}`,
        isVerified: false,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: data.email,
        role: 'company',
        company: newCompany,
        createdAt: new Date().toISOString()
      }
      
      console.log('Store: Setting user state...', newUser)
      
      // 新規ユーザーには完全にクリーンな状態を設定
      set({ 
        user: newUser, 
        isAuthenticated: true, 
        isLoading: false,
        // 全データをクリア
        projects: [],
        talents: [],
        matches: [],
        partners: [],
        shares: [],
        follows: [],
        partnerProjects: [],
        partnerTalents: [],
        isInitialized: false
      })
      
      // 既存のローカルストレージを完全にクリア
      localStorage.clear()
      
      // 新しい認証情報を保存
      localStorage.setItem('mcpartner_auth', JSON.stringify({
        user: newUser,
        timestamp: Date.now()
      }))
      
      console.log('Store: Registration completed successfully')
      
    } catch (error) {
      console.error('Store: Registration failed:', error)
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    console.log('Logging out and clearing all data')
    
    set({ 
      user: null, 
      isAuthenticated: false,
      // 全データをクリア
      projects: [],
      talents: [],
      matches: [],
      partners: [],
      shares: [],
      follows: [],
      partnerProjects: [],
      partnerTalents: [],
      currentPartnerId: 'current_company',
      isInitialized: false,
      isLoading: false
    })
    
    // ローカルストレージを完全にクリア
    localStorage.clear()
  },

  checkAuth: async () => {
    try {
      console.log('Store: Checking authentication...')
      const authData = localStorage.getItem('mcpartner_auth')
      
      if (authData) {
        const { user, timestamp } = JSON.parse(authData)
        
        // 24時間以内のログインデータなら有効とする
        const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000
        
        if (isValid && user) {
          console.log('Store: Valid auth found, setting user:', user.email)
          set({ 
            user, 
            isAuthenticated: true 
          })
          return
        } else {
          console.log('Store: Auth data expired or invalid')
        }
      } else {
        console.log('Store: No auth data found')
      }
      
      // 無効な場合はログアウト状態にする
      set({ 
        user: null, 
        isAuthenticated: false 
      })
      
    } catch (error) {
      console.error('Store: Auth check failed:', error)
      set({ 
        user: null, 
        isAuthenticated: false 
      })
    }
  }
}))