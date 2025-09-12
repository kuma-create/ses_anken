import { useEffect } from "react"
import { Layout } from "./components/Layout"
import { Dashboard } from "./components/Dashboard"
import { ProjectList } from "./components/ProjectList"
import { ProjectDetail } from "./components/ProjectDetail"
import { ProjectForm } from "./components/ProjectForm"
import { TalentList } from "./components/TalentList"
import { TalentDetail } from "./components/TalentDetail"
import { TalentForm } from "./components/TalentForm"
import { Matching } from "./components/Matching"
import { ShareCenter } from "./components/ShareCenter"
import { Partners } from "./components/Partners"
import { PartnerDetail } from "./components/PartnerDetail"
import { Settings } from "./components/Settings"
import { Login } from "./components/Login"
import { Admin } from "./components/Admin"
import { useRouter, matchPath } from "./lib/router"
import { useAppStore } from "./lib/store"

export default function App() {
  const { currentPath } = useRouter()
  const { initializeApp, initializeDatabase, checkAuth, isLoading, isInitialized, isAuthenticated, user } = useAppStore()

  useEffect(() => {
    const initialize = async () => {
      try {
        // まず認証状態をチェック
        await checkAuth()
        console.log('Auth check completed, isAuthenticated:', isAuthenticated)
      } catch (error) {
        console.error('Auth check failed:', error)
      }
    }

    initialize()
  }, [checkAuth])

  // 認証状態が確定してからアプリを初期化
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      console.log('User authenticated, initializing app...')
      
      const initialize = async () => {
        try {
          // 新規ユーザーの場合はまずデータベースを初期化
          if (user && user.id && user.id.startsWith('user_')) {
            console.log('New user detected, initializing data structure...')
            try {
              await initializeDatabase()
              console.log('Data structure initialized successfully')
            } catch (dbError) {
              console.warn('Data structure initialization failed, continuing with empty data:', dbError)
              // データベース初期化に失敗してもアプリは続行
            }
          }
          
          // その後アプリを初期化
          await initializeApp()
          console.log('App initialization completed')
        } catch (error) {
          console.error('App initialization failed:', error)
          // 初期化に失敗してもアプリは使えるようにする
          console.log('Continuing with limited functionality')
        }
      }
      
      initialize()
    }
  }, [isAuthenticated, isInitialized, initializeApp, initializeDatabase, user])

  const renderPage = () => {
    // 未認証の場合はログイン画面を表示
    if (!isAuthenticated) {
      return <Login />
    }

    // Show loading state
    if (isLoading && !isInitialized) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E63F3] mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">初期化中...</h3>
            <p className="text-sm text-gray-600">データベースに接続しています。</p>
          </div>
        </div>
      )
    }

    // 管理者の場合は管理者画面への導線を追加
    if (user?.role === 'admin' && currentPath === '/admin') {
      return <Admin />
    }

    // Dashboard
    if (currentPath === '/') {
      return <Dashboard />
    }
    
    // Projects
    if (currentPath === '/projects') {
      return <ProjectList />
    }
    
    if (currentPath === '/projects/new') {
      return <ProjectForm />
    }
    
    const projectDetailMatch = matchPath('/projects/[id]', currentPath)
    if (projectDetailMatch.match) {
      if (currentPath.endsWith('/edit')) {
        return <ProjectForm projectId={projectDetailMatch.params.id} />
      }
      return <ProjectDetail projectId={projectDetailMatch.params.id} />
    }
    
    // Talents
    if (currentPath === '/talents') {
      return <TalentList />
    }
    
    if (currentPath === '/talents/new') {
      return <TalentForm />
    }
    
    const talentDetailMatch = matchPath('/talents/[id]', currentPath)
    if (talentDetailMatch.match) {
      if (currentPath.endsWith('/edit')) {
        return <TalentForm talentId={talentDetailMatch.params.id} />
      }
      return <TalentDetail talentId={talentDetailMatch.params.id} />
    }
    
    // Matching
    if (currentPath === '/matching') {
      return <Matching />
    }
    
    // Share Center
    if (currentPath === '/share') {
      return <ShareCenter />
    }
    
    // Partners
    if (currentPath === '/partners') {
      return <Partners />
    }
    
    const partnerDetailMatch = matchPath('/partners/[id]', currentPath)
    if (partnerDetailMatch.match) {
      return <PartnerDetail partnerId={partnerDetailMatch.params.id} />
    }
    
    // Settings
    if (currentPath === '/settings') {
      return <Settings />
    }
    
    // 404 fallback
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">ページが見つかりません</h3>
          <p className="text-sm text-gray-600">お探しのページは存在しないか、移動された可能性があります。</p>
        </div>
      </div>
    )
  }

  // 未認証の場合はLayoutなしでログイン画面を表示
  if (!isAuthenticated) {
    return renderPage()
  }

  return (
    <Layout currentPath={currentPath}>
      {renderPage()}
    </Layout>
  )
}