import React, { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, Type, AlertTriangle, X } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

interface PdfUploaderProps {
  onDataExtracted: (data: any) => void
  onClose?: () => void
  extractionType: 'project' | 'talent'
  className?: string
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onDataExtracted, onClose, extractionType, className }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [manualText, setManualText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // サーバーサイドでPDF処理を行う
    const formData = new FormData()
    formData.append('pdf', file)

    const { projectId, publicAnonKey } = await import('../utils/supabase/info')
    
    console.log(`Processing PDF: ${file.name} (${file.size} bytes)`)
    
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b70e7431/extract-pdf-text`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('PDF processing error:', result)
      // より詳細なエラーメッセージを提供
      if (result.error?.includes('文字化け') || result.error?.includes('エンコーディング')) {
        throw new Error('PDFの文字エンコーディングに問題があります。macで作成されたPDFの場合は、手動でテキストを入力してください。')
      }
      throw new Error(result.error || 'PDFの処理に失敗しました')
    }

    if (!result.text || !result.text.trim()) {
      throw new Error('PDFからテキストを抽出できませんでした。画像のみのPDFまたは保護されたPDFの可能性があります。手動でテキストを入力してください。')
    }

    console.log(`Successfully extracted ${result.text.length} characters from PDF`)
    return result.text.trim()
  }

  const processWithAI = async (text: string) => {
    const { pdfApi } = await import('../lib/pdf-api')
    
    const result = extractionType === 'project' 
      ? await pdfApi.parseProjectPdf(text)
      : await pdfApi.parseTalentPdf(text)
    
    if (result.error) {
      throw new Error(result.error)
    }

    return result.data
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください')
      return
    }

    setIsProcessing(true)
    setError(null)
    setWarning(null)
    setSuccess(false)
    setExtractedText('')

    try {
      console.log('PDFからテキストを抽出中...')
      const text = await extractTextFromPdf(file)
      
      // 抽出されたテキストの品質チェック
      const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
      const alphaNumChars = (text.match(/[A-Za-z0-9]/g) || []).length;
      const commonSymbols = (text.match(/[.,!?;:()\-\s@]/g) || []).length;
      const totalReadableChars = japaneseChars + alphaNumChars + commonSymbols;
      
      // より厳密な文字化け文字の定義（制御文字や意味不明な記号の連続）
      const controlChars = (text.match(/[\u0000-\u001F\u007F-\u009F]/g) || []).length;
      const weirdSymbols = (text.match(/[^\u0020-\u007E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\u00A0-\u00FF]/g) || []).length;
      const actualWeirdChars = controlChars + weirdSymbols;
      
      const readableRatio = text.length > 0 ? totalReadableChars / text.length : 0;
      const weirdCharRatio = text.length > 0 ? actualWeirdChars / text.length : 0;
      
      console.log(`Text extraction quality: Length=${text.length}, Readable=${totalReadableChars} (${(readableRatio*100).toFixed(1)}%), Weird=${actualWeirdChars} (${(weirdCharRatio*100).toFixed(1)}%)`)
      
      // 警告レベルの文字化け検出（処理は続行するが警告を表示）
      let qualityWarning = null;
      if (weirdCharRatio > 0.3 && text.length < 100) {
        qualityWarning = '抽出されたテキストに一部文字化けが含まれている可能性があります。結果を確認して、必要に応じて手動で修正してください。';
      } else if (readableRatio < 0.5 && text.length > 50) {
        qualityWarning = 'PDFのテキスト抽出品質が低い可能性があります。結果を確認して、必要に応じて「テキスト入力」タブで手動入力してください。';
      }
      
      // 致命的な文字化けの場合のみ処理を停止
      if (weirdCharRatio > 0.8 || (readableRatio < 0.1 && text.length > 20)) {
        console.warn('Severe garbled text detected - stopping processing');
        setError('PDFからのテキスト抽出で深刻な文字化けが検出されました。「テキスト入力」タブで手動入力を試してください。')
        return
      }
      
      // 警告がある場合は表示（処理は続行）
      if (qualityWarning) {
        console.warn('Text quality warning:', qualityWarning);
        setWarning(qualityWarning)
      }
      
      setExtractedText(text.substring(0, 500) + (text.length > 500 ? '...' : '')) // プレビュー用に短縮
      
      console.log('AIで情報を解析中...')
      const data = await processWithAI(text)
      
      console.log('抽出されたデータ:', data)
      onDataExtracted(data)
      setSuccess(true)
      
      // Close after successful extraction
      if (onClose) {
        setTimeout(() => onClose(), 1500)
      }
      
      // 警告があっても成功した場合は警告をクリア
      if (warning) {
        setTimeout(() => setWarning(null), 2000)
      }
      
    } catch (error) {
      console.error('PDF処理エラー:', error)
      setError(error instanceof Error ? error.message : '処理中にエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      setError('テキストを入力してください')
      return
    }

    setIsProcessing(true)
    setError(null)
    setWarning(null)
    setSuccess(false)

    try {
      console.log('AIで情報を解析中...')
      const data = await processWithAI(manualText)
      
      console.log('抽出されたデータ:', data)
      onDataExtracted(data)
      setSuccess(true)
      setExtractedText(manualText.substring(0, 500) + (manualText.length > 500 ? '...' : ''))
      
      // Close after successful extraction
      if (onClose) {
        setTimeout(() => onClose(), 1500)
      }
      
    } catch (error) {
      console.error('処理エラー:', error)
      setError(error instanceof Error ? error.message : '処理中にエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">
                {extractionType === 'project' ? '案件情報' : '人材情報'}の自動入力
              </h3>
              <p className="text-sm text-muted-foreground">
                PDFまたはテキストから自動で情報を抽出してフォームに入力します
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">PDFアップロード</TabsTrigger>
              <TabsTrigger value="manual">テキスト入力</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleUploadClick}
                  disabled={isProcessing}
                  className="w-full"
                  variant="outline"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      PDFファイルを選択
                    </>
                  )}
                </Button>
                
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {extractionType === 'project' ? '案件概要テキスト' : 'スキルシート・経歴テキスト'}
                </label>
                <Textarea
                  placeholder={extractionType === 'project' 
                    ? '案件名、概要、必要スキル、予算、期間などの情報をペーストしてください...'
                    : '氏名、スキル、経験年数、経歴、資格などの情報をペーストしてください...'
                  }
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={isProcessing || !manualText.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Type className="mr-2 h-4 w-4" />
                      テキストから自動入力
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {warning && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">{warning}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                情報を正常に抽出しました！フォームに自動入力されています。
              </AlertDescription>
            </Alert>
          )}

          {extractedText && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">抽出されたテキスト（プレビュー）:</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {extractedText}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Remove default export