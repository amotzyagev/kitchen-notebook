'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'

interface PhotoUploadProps {
  onExtracted: (data: AIRecipeExtraction) => void
  onError?: (message: string) => void
}

export function PhotoUpload({ onExtracted, onError }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Compress with browser-image-compression
      const imageCompression = (await import('browser-image-compression')).default
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1568,
        maxSizeMB: 1,
        useWebWorker: true,
      })

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(compressed)
      })

      // Determine media type
      const mediaType = compressed.type as 'image/jpeg' | 'image/png' | 'image/webp'
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(mediaType)) {
        throw new Error('סוג קובץ לא נתמך. יש להשתמש ב-JPEG, PNG או WebP')
      }

      // Call API
      const response = await fetch('/api/recipes/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'שגיאה בזיהוי טקסט מהתמונה')
      }

      const data: AIRecipeExtraction = await response.json()
      onExtracted(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בעיבוד התמונה'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full h-32 flex flex-col gap-2"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-8 animate-spin" />
            <span>מעבד תמונה...</span>
          </>
        ) : (
          <>
            <Camera className="size-8" />
            <span>צלם או בחר תמונה</span>
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
