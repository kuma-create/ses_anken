import { ReactNode, useState } from 'react'
import { useRouter } from '../lib/router'
import { useAppStore } from '../lib/store'
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  GitMerge, 
  Share2, 
  Building, 
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Shield,
  LogOut,
  User
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface LayoutProps {
  children: ReactNode
  currentPath?: string
}

export function Layout({ children, currentPath = '/' }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { navigate } = useRouter()
  const { user, logout } = useAppStore()

  const navigation = [
    { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
    { name: '案件', href: '/projects', icon: Briefcase },
    { name: '人材', href: '/talents', icon: Users },
    { name: 'マッチング', href: '/matching', icon: GitMerge },
    { name: '共有', href: '/share', icon: Share2 },
    { name: '取引先', href: '/partners', icon: Building },
    { name: '設定', href: '/settings', icon: Settings },
    ...(user?.role === 'admin' ? [{ name: '管理者', href: '/admin', icon: Shield }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const getUserInitials = () => {
    if (user?.company?.contactPerson) {
      return user.company.contactPerson.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = () => {
    if (user?.company?.contactPerson) {
      return user.company.contactPerson
    }
    return user?.email || 'ユーザー'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#1E63F3] rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">MC Partner</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="検索..."
                className="pl-10 w-64"
              />
            </div>
            
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#1E63F3] text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                  {user?.company && (
                    <p className="text-xs text-gray-600">{user.company.name}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="w-4 h-4 mr-2" />
                  プロフィール
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  設定
                </DropdownMenuItem>
                {user?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    管理者画面
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = currentPath === item.href || 
                  (item.href !== '/' && currentPath.startsWith(item.href))
                
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href)
                      setSidebarOpen(false)
                    }}
                    className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full text-left ${
                      isActive
                        ? 'bg-[#1E63F3] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:pl-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}