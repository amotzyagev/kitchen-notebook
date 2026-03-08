'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'

interface CoverImageUploadProps {
  recipeId: string
  hasCoverImage: boolean
}

export function CoverImageUpload({ recipeId, hasCoverImage }: CoverImageUploadProps) {
  const router = useRouter()
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRemoveImage() {
    if (!window.confirm('האם למחוק את התמונה?')) return

    setIsRemoving(true)
    setError(null)

    try {
      const response = await fetch(`/api/recipes/${recipeId}/cover-image`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'שגיאה במחיקת התמונה')
      }

      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה במחיקת התמונה'
      setError(message)
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)
    setShowOptions(false)

    try {
      const imageCompression = (await import('browser-image-compression')).default
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 800,
        maxSizeMB: 0.3,
        fileType: 'image/webp',
        useWebWorker: true,
      })

      const formData = new FormData()
      formData.append('file', compressed)

      const response = await fetch(`/api/recipes/${recipeId}/cover-image`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'שגיאה בהעלאת התמונה')
      }

      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בהעלאת התמונה'
      setError(message)
    } finally {
      setIsLoading(false)
      if (mediaInputRef.current) mediaInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2" dir="rtl">
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {isLoading ? (
        <Button variant="outline" size="sm" disabled className="min-h-[44px] min-w-[44px]">
          <Loader2 className="size-4 animate-spin ml-2" />
          מעלה תמונה...
        </Button>
      ) : showOptions ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => mediaInputRef.current?.click()}
            >
              ספריית מדיה
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => cameraInputRef.current?.click()}
            >
              מצלמה
            </Button>
          </div>
          {hasCoverImage && (
            <p className="text-sm text-muted-foreground">התמונה הנוכחית תוחלף</p>
          )}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setShowOptions(true)}
          >
            <ImagePlus className="size-4 ml-2" />
            {hasCoverImage ? 'החלפת תמונה' : 'הוספת תמונה'}
          </Button>
          {hasCoverImage && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] text-destructive"
              onClick={handleRemoveImage}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="size-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="size-4 ml-2" />
              )}
              הסרת תמונה
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
