import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Switch } from "./ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Textarea } from "./ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Palette,
  Mail,
  Key,
  Download,
  Upload,
  Trash2,
  Save,
  Globe,
  Monitor,
  Smartphone,
  AlertTriangle
} from "lucide-react"
import { SectionHeader } from "./SectionHeader"
import { useAppStore } from "../lib/store"
import { resetAllData as apiResetAllData } from "../lib/api"
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

interface UserProfile {
  name: string
  email: string
  company: string
  role: string
  phone?: string
  timezone: string
  language: string
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  matchingAlerts: boolean
  projectUpdates: boolean
  systemMaintenance: boolean
  weeklyReports: boolean
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  ipWhitelist: string[]
  loginNotifications: boolean
  passwordRequirements: {
    minLength: number
    requireSpecialChars: boolean
    requireNumbers: boolean
    requireUppercase: boolean
  }
}

export function Settings() {
  const { 
    projects, talents, partners, matches, shares, follows,
    partnerProjects, partnerTalents,
    logout
  } = useAppStore()
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '管理者太郎',
    email: 'admin@mc-partner.com',
    company: 'MC Partner株式会社',
    role: 'システム管理者',
    phone: '03-1234-5678',
    timezone: 'Asia/Tokyo',
    language: 'ja'
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    matchingAlerts: true,
    projectUpdates: true,
    systemMaintenance: true,
    weeklyReports: true
  })

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 480, // 8 hours in minutes
    ipWhitelist: [],
    loginNotifications: true,
    passwordRequirements: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true
    }
  })

  const [systemSettings, setSystemSettings] = useState({
    theme: 'light',
    compactMode: false,
    autoSave: true,
    defaultMatchingThreshold: 70,
    maxFileSize: 10, // MB
    dataRetentionDays: 365,
    backupFrequency: 'daily'
  })

  const [apiSettings, setApiSettings] = useState({
    apiKey: '••••••••••••••••',
    webhookUrl: '',
    rateLimit: 1000,
    enableLogging: true
  })

  const saveProfile = () => {
    // プロフィール保存処理
    console.log('Profile saved:', userProfile)
  }

  const saveNotifications = () => {
    // 通知設定保存処理
    console.log('Notifications saved:', notifications)
  }

  const saveSecurity = () => {
    // セキュリティ設定保存処理
    console.log('Security saved:', security)
  }

  const saveSystemSettings = () => {
    // システム設定保存処理
    console.log('System settings saved:', systemSettings)
  }

  const exportData = () => {
    // データエクスポート処理
    console.log('Exporting data...')
  }

  const importData = () => {
    // データインポート処理
    console.log('Importing data...')
  }

  const resetAllData = async () => {
    try {
      console.log('Resetting all data...')
      
      // 1. サーバー側のKVストアをリセット
      console.log('Resetting server-side data...')
      const serverResetResult = await apiResetAllData()
      if (serverResetResult.data?.success) {
        console.log('Server-side data reset successfully:', serverResetResult.data.resetKeys)
      } else {
        console.warn('Server-side data reset failed:', serverResetResult.error)
      }
      
      // 2. ローカルストレージをクリア
      console.log('Clearing local storage...')
      localStorage.clear()
      
      // 3. ストアをリセットしてログアウト処理を実行
      console.log('Logging out and resetting store...')
      logout()
      
      // 4. ページをリロードして完全にリセット
      console.log('Reloading page for complete reset...')
      window.location.reload()
      
      console.log('All data has been reset successfully')
    } catch (error) {
      console.error('Error resetting data:', error)
      // エラーが発生してもローカルリセットは実行
      localStorage.clear()
      logout()
      window.location.reload()
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="設定"
        description="アプリケーションの各種設定を管理します"
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">プロフィール</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">通知</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">セキュリティ</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">システム</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center space-x-2">
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">データ</span>
          </TabsTrigger>
        </TabsList>

        {/* プロフィール設定 */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">氏名</label>
                  <Input
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">メールアドレス</label>
                  <Input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">会社名</label>
                  <Input
                    value={userProfile.company}
                    onChange={(e) => setUserProfile({...userProfile, company: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">役職</label>
                  <Input
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">電話番号</label>
                  <Input
                    value={userProfile.phone || ''}
                    onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">タイムゾーン</label>
                  <Select value={userProfile.timezone} onValueChange={(value) => setUserProfile({...userProfile, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">言語</label>
                <Select value={userProfile.language} onValueChange={(value) => setUserProfile({...userProfile, language: value})}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知設定 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">通知方法</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">メール通知</div>
                        <div className="text-sm text-gray-600">重要な更新をメールで受信</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">プッシュ通知</div>
                        <div className="text-sm text-gray-600">ブラウザプッシュ通知を受信</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">SMS通知</div>
                        <div className="text-sm text-gray-600">緊急時にSMSで通知</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, smsNotifications: checked})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">通知内容</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">マッチングアラート</div>
                      <div className="text-sm text-gray-600">新しいマッチングが見つかった時</div>
                    </div>
                    <Switch
                      checked={notifications.matchingAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, matchingAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">案件更新</div>
                      <div className="text-sm text-gray-600">案件情報が更新された時</div>
                    </div>
                    <Switch
                      checked={notifications.projectUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, projectUpdates: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">システムメンテナンス</div>
                      <div className="text-sm text-gray-600">システムメンテナンス情報</div>
                    </div>
                    <Switch
                      checked={notifications.systemMaintenance}
                      onCheckedChange={(checked) => setNotifications({...notifications, systemMaintenance: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">週次レポート</div>
                      <div className="text-sm text-gray-600">週次の活動レポート</div>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveNotifications} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* セキュリティ設定 */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>認証・セキュリティ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">二要素認証</div>
                    <div className="text-sm text-gray-600">ログイン時の追加認証を有効化</div>
                  </div>
                  <Switch
                    checked={security.twoFactorAuth}
                    onCheckedChange={(checked) => setSecurity({...security, twoFactorAuth: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">ログイン通知</div>
                    <div className="text-sm text-gray-600">新しいデバイスからのログイン時に通知</div>
                  </div>
                  <Switch
                    checked={security.loginNotifications}
                    onCheckedChange={(checked) => setSecurity({...security, loginNotifications: checked})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">セッションタイムアウト（分）</label>
                  <Select 
                    value={security.sessionTimeout.toString()} 
                    onValueChange={(value) => setSecurity({...security, sessionTimeout: parseInt(value)})}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1時間</SelectItem>
                      <SelectItem value="240">4時間</SelectItem>
                      <SelectItem value="480">8時間</SelectItem>
                      <SelectItem value="1440">24時間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>パスワード要件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">最小文字数</label>
                  <Select 
                    value={security.passwordRequirements.minLength.toString()} 
                    onValueChange={(value) => setSecurity({
                      ...security, 
                      passwordRequirements: {
                        ...security.passwordRequirements,
                        minLength: parseInt(value)
                      }
                    })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6文字</SelectItem>
                      <SelectItem value="8">8文字</SelectItem>
                      <SelectItem value="10">10文字</SelectItem>
                      <SelectItem value="12">12文字</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>特殊文字を必須とする</span>
                    <Switch
                      checked={security.passwordRequirements.requireSpecialChars}
                      onCheckedChange={(checked) => setSecurity({
                        ...security,
                        passwordRequirements: {
                          ...security.passwordRequirements,
                          requireSpecialChars: checked
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>数字を必須とする</span>
                    <Switch
                      checked={security.passwordRequirements.requireNumbers}
                      onCheckedChange={(checked) => setSecurity({
                        ...security,
                        passwordRequirements: {
                          ...security.passwordRequirements,
                          requireNumbers: checked
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>大文字を必須とする</span>
                    <Switch
                      checked={security.passwordRequirements.requireUppercase}
                      onCheckedChange={(checked) => setSecurity({
                        ...security,
                        passwordRequirements: {
                          ...security.passwordRequirements,
                          requireUppercase: checked
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveSecurity} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* システム設定 */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>システム設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">表示設定</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">テーマ</label>
                    <Select value={systemSettings.theme} onValueChange={(value) => setSystemSettings({...systemSettings, theme: value})}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">ライト</SelectItem>
                        <SelectItem value="dark">ダーク</SelectItem>
                        <SelectItem value="auto">自動</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">コンパクトモード</div>
                      <div className="text-sm text-gray-600">画面領域を効率的に活用</div>
                    </div>
                    <Switch
                      checked={systemSettings.compactMode}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, compactMode: checked})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">動作設定</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">自動保存</div>
                      <div className="text-sm text-gray-600">入力内容を自動的に保存</div>
                    </div>
                    <Switch
                      checked={systemSettings.autoSave}
                      onCheckedChange={(checked) => setSystemSettings({...systemSettings, autoSave: checked})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">デフォルトマッチング閾値（%）</label>
                    <Select 
                      value={systemSettings.defaultMatchingThreshold.toString()} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, defaultMatchingThreshold: parseInt(value)})}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60%</SelectItem>
                        <SelectItem value="70">70%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">最大ファイルサイズ（MB）</label>
                    <Select 
                      value={systemSettings.maxFileSize.toString()} 
                      onValueChange={(value) => setSystemSettings({...systemSettings, maxFileSize: parseInt(value)})}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5MB</SelectItem>
                        <SelectItem value="10">10MB</SelectItem>
                        <SelectItem value="20">20MB</SelectItem>
                        <SelectItem value="50">50MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSystemSettings} className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API設定 */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">APIキー</label>
                <div className="flex space-x-2">
                  <Input value={apiSettings.apiKey} readOnly />
                  <Button variant="outline">再生成</Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL</label>
                <Input
                  value={apiSettings.webhookUrl}
                  onChange={(e) => setApiSettings({...apiSettings, webhookUrl: e.target.value})}
                  placeholder="https://your-domain.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">レート制限（リクエスト/時間）</label>
                <Select 
                  value={apiSettings.rateLimit.toString()} 
                  onValueChange={(value) => setApiSettings({...apiSettings, rateLimit: parseInt(value)})}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="5000">5,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">APIログ出力</div>
                  <div className="text-sm text-gray-600">API使用状況をログに記録</div>
                </div>
                <Switch
                  checked={apiSettings.enableLogging}
                  onCheckedChange={(checked) => setApiSettings({...apiSettings, enableLogging: checked})}
                />
              </div>

              <div className="flex justify-end">
                <Button className="bg-[#1E63F3] hover:bg-[#1E63F3]/90">
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* データ管理 */}
        <TabsContent value="data">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>データエクスポート・インポート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">データエクスポート</div>
                    <div className="text-sm text-gray-600">
                      案件・人材・マッチング情報をCSV形式でエクスポート
                    </div>
                  </div>
                  <Button onClick={exportData} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    エクスポート
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">データインポート</div>
                    <div className="text-sm text-gray-600">
                      CSV形式でデータを一括インポート
                    </div>
                  </div>
                  <Button onClick={importData} variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    インポート
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>データ保持・削除</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">データ保持期間（日）</label>
                  <Select 
                    value={systemSettings.dataRetentionDays.toString()} 
                    onValueChange={(value) => setSystemSettings({...systemSettings, dataRetentionDays: parseInt(value)})}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90日</SelectItem>
                      <SelectItem value="180">180日</SelectItem>
                      <SelectItem value="365">1年</SelectItem>
                      <SelectItem value="1095">3年</SelectItem>
                      <SelectItem value="0">無制限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">バックアップ頻度</label>
                  <Select 
                    value={systemSettings.backupFrequency} 
                    onValueChange={(value) => setSystemSettings({...systemSettings, backupFrequency: value})}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">毎日</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                      <SelectItem value="monthly">毎月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        すべてのデータを削除（危険）
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          データの完全削除
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          この操作により、以下のすべてのデータが削除されます：
                          <ul className="mt-2 ml-4 list-disc text-sm">
                            <li>案件情報: {projects.length}件</li>
                            <li>人材情報: {talents.length}件</li>
                            <li>取引先情報: {partners.length}件</li>
                            <li>マッチング履歴: {matches.length}件</li>
                            <li>フォロー関係: {follows.length}件</li>
                            <li>共有情報: {shares.length}件</li>
                            <li>共有案件: {partnerProjects.length}件</li>
                            <li>共有人材: {partnerTalents.length}件</li>
                          </ul>
                          <p className="mt-3 font-semibold text-red-600">
                            この操作は取り消すことができません。本当に削除しますか？
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={resetAllData}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          完全に削除する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <p className="text-xs text-gray-500 mt-2">
                    この操作は取り消せません。実行前に必ずバックアップを取得してください。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}