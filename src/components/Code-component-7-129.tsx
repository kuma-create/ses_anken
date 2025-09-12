import React, { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

interface PdfUploaderProps {
  onDataExtracted: (data: any) => void
  type: 'project' | 'talent'
  className?: string
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onDataExtracted, type, className }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async function(e) {
        try {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer)
          
          // PDF.jsを動的にロード
          const pdfjsLib = await import('pdfjs-dist')
          
          // PDF.jsのworkerを設定
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
          let fullText = ''
          
          // 全ページのテキストを抽出
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            fullText += pageText + '\n'
          }
          
          resolve(fullText)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
      reader.readAsArrayBuffer(file)
    })
  }

  const processWithAI = async (text: string) => {
    const endpoint = type === 'project' 
      ? '/api/parse-project-pdf' 
      : '/api/parse-talent-pdf'
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`AI処理に失敗しました: ${response.statusText}`)
    }

    const result = await response.json()
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
    setSuccess(false)
    setExtractedText('')

    try {
      console.log('PDFからテキストを抽出中...')
      const text = await extractTextFromPdf(file)
      setExtractedText(text.substring(0, 500) + '...') // プレビュー用に短縮
      
      console.log('AIで情報を解析中...')
      const data = await processWithAI(text)
      
      console.log('抽出されたデータ:', data)
      onDataExtracted(data)
      setSuccess(true)
      
    } catch (error) {
      console.error('PDF処理エラー:', error)
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
                {type === 'project' ? '案件概要PDF' : 'スキルシートPDF'}をアップロード
              </h3>
              <p className="text-sm text-muted-foreground">
                PDFから自動で情報を抽出してフォームに入力します
              </p>
            </div>
          </div>

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

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                PDFから情報を正常に抽出しました！フォームに自動入力されています。
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

export default PdfUploader