'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Link as LinkIcon } from 'lucide-react'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'

interface UrlInputProps {
  onExtracted: (data: AIRecipeExtraction, sourceUrl: string) => void
  onError?: (message: string) => void
}

export function UrlInput({ onExtracted, onError }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recipes/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || 'שגיאה בעיבוד המתכון')
      }

      const data: AIRecipeExtraction = await response.json()
      onExtracted(data, trimmedUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בחילוץ המתכון'
      setError(message)
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="url"
          placeholder="הדבק קישור למתכון"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !url.trim()}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LinkIcon className="size-4" />
          )}
          חלץ מתכון
        </Button>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          <span>מחלץ מתכון מהקישור...</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
