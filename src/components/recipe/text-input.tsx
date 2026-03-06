'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'

interface TextInputProps {
  onExtracted: (data: AIRecipeExtraction) => void
}

export function TextInput({ onExtracted }: TextInputProps) {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!text.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recipes/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message || 'שגיאה בעיבוד הטקסט')
      }

      const data: AIRecipeExtraction = await response.json()
      onExtracted(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-muted-foreground">
        הדבק את טקסט המתכון והבינה המלאכותית תחלץ את המרכיבים וההוראות.
      </p>
      <Textarea
        placeholder="הדבק כאן את טקסט המתכון..."
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLoading}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? 'מעבד...' : 'חלץ מתכון'}
      </Button>
    </div>
  )
}
