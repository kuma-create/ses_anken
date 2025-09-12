import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Checkbox } from "./ui/checkbox"
import { Alert, AlertDescription } from "./ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { 
  Building, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  Users
} from "lucide-react"
import { useAppStore } from "../lib/store"

export function Login() {
  const { login, register, isLoading } = useAppStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // ログインフォーム
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  
  // 新規登録フォーム
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyType: 'agency' as 'client' | 'agency' | 'freelancer',
    contactPerson: '',
    phone: '',
    website: '',
    agreeToTerms: false
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!loginForm.email || !loginForm.password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }

    try {
      await login(loginForm.email, loginForm.password)
    } catch (err) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    // バリデーション
    if (!registerForm.email || !registerForm.password || !registerForm.companyName || !registerForm.contactPerson) {
      setError('必須項目をすべて入力してください')
      return
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    
    if (registerForm.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    
    if (!registerForm.agreeToTerms) {
      setError('利用規約に同意してください')
      return
    }

    try {
      await register({
        email: registerForm.email,
        password: registerForm.password,
        company: {
          name: registerForm.companyName,
          type: registerForm.companyType,
          contactPerson: registerForm.contactPerson,
          phone: registerForm.phone,
          website: registerForm.website
        }
      })
      setSuccess('アカウントが作成されました。確認メールをお送りしましたのでご確認ください。')
    } catch (err) {
      setError('アカウント作成に失敗しました。しばらく時間をおいて再度お試しください。')
    }
  }

  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'クライアント企業'
      case 'agency': return 'SES・人材紹介会社'
      case 'freelancer': return 'フリーランス・個人事業主'
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・ヘッダー */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1E63F3] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">MC Partner</h1>
          <p className="text-gray-600">B2B SESマッチングプラットフォーム</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">
              アカウントにアクセス
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>
              
              {/* エラー・成功メッセージ */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}

              {/* ログインタブ */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">メールアドレス</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@company.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">パスワード</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="パスワードを入力"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={loginForm.rememberMe}
                        onCheckedChange={(checked) => setLoginForm({...loginForm, rememberMe: checked as boolean})}
                      />
                      <Label htmlFor="remember" className="text-sm">ログイン状態を保持</Label>
                    </div>
                    <Button variant="link" className="p-0 text-sm">
                      パスワードを忘れた場合
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1E63F3] hover:bg-[#1E63F3]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? 'ログイン中...' : 'ログイン'}
                  </Button>
                </form>
              </TabsContent>

              {/* 新規登録タブ */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">会社名 *</Label>
                      <Input
                        id="company-name"
                        placeholder="株式会社サンプル"
                        value={registerForm.companyName}
                        onChange={(e) => setRegisterForm({...registerForm, companyName: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company-type">事業形態 *</Label>
                      <Select 
                        value={registerForm.companyType} 
                        onValueChange={(value: 'client' | 'agency' | 'freelancer') => 
                          setRegisterForm({...registerForm, companyType: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">クライアント企業</SelectItem>
                          <SelectItem value="agency">SES・人材紹介会社</SelectItem>
                          <SelectItem value="freelancer">フリーランス・個人事業主</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">担当者名 *</Label>
                      <Input
                        id="contact-person"
                        placeholder="田中太郎"
                        value={registerForm.contactPerson}
                        onChange={(e) => setRegisterForm({...registerForm, contactPerson: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        placeholder="03-1234-5678"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Webサイト</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://your-company.com"
                      value={registerForm.website}
                      onChange={(e) => setRegisterForm({...registerForm, website: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">メールアドレス *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@company.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password">パスワード *</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="8文字以上"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">パスワード確認 *</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="再入力"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={registerForm.agreeToTerms}
                      onCheckedChange={(checked) => setRegisterForm({...registerForm, agreeToTerms: checked as boolean})}
                      className="mt-1"
                    />
                    <Label htmlFor="terms" className="text-sm leading-5">
                      <span className="text-red-500">*</span> 
                      <Button variant="link" className="p-0 text-sm underline">利用規約</Button>
                      および
                      <Button variant="link" className="p-0 text-sm underline">プライバシーポリシー</Button>
                      に同意します
                    </Label>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-[#1E63F3] hover:bg-[#1E63F3]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? 'アカウント作成中...' : 'アカウントを作成'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2024 MC Partner. All rights reserved.</p>
          <p className="mt-1">
            お問い合わせ: 
            <Button variant="link" className="p-0 text-sm underline ml-1">
              support@mc-partner.com
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}