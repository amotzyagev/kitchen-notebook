'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRecipes } from '@/hooks/use-recipes'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'

type FileStatus = 'pending' | 'processing' | 'success' | 'failed'

interface FileEntry {
  file: File
  status: FileStatus
  error?: string
  recipe?: AIRecipeExtraction
}

const ACCEPTED_EXTENSIONS = '.txt,.md,.doc,.docx,.jpg,.jpeg,.png,.webp'

function statusIcon(status: FileStatus) {
  switch (status) {
    case 'pending': return '\u23F3'
    case 'processing': return '\uD83D\uDD04'
    case 'success': return '\u2705'
    case 'failed': return '\u274C'
  }
}

export function FileImport() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createRecipe } = useRecipes()

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected) return
    const entries: FileEntry[] = Array.from(selected).map(file => ({
      file,
      status: 'pending' as const,
    }))
    setFiles(prev => [...prev, ...entries])
    setDone(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function clearAll() {
    setFiles([])
    setDone(false)
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function startImport() {
    setImporting(true)
    setDone(false)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'success') continue

      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'processing' as const, error: undefined } : f
      ))

      try {
        const base64 = await fileToBase64(files[i].file)

        const response = await fetch('/api/recipes/parse-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            filename: files[i].file.name,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.message || 'שגיאה בעיבוד הקובץ')
        }

        const extraction: AIRecipeExtraction = await response.json()

        await createRecipe({
          title: extraction.title,
          ingredients: extraction.ingredients,
          instructions: extraction.instructions,
          notes: extraction.notes || undefined,
          tags: extraction.tags ?? [],
          source_type: 'import',
          original_text: extraction.original_text || undefined,
        })

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'success' as const, recipe: extraction } : f
        ))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'failed' as const, error: message } : f
        ))
      }
    }

    setImporting(false)
    setDone(true)
  }

  const successCount = files.filter(f => f.status === 'success').length
  const failedCount = files.filter(f => f.status === 'failed').length
  const pendingCount = files.filter(f => f.status === 'pending').length
  const hasFiles = files.length > 0
  const canImport = hasFiles && !importing && (pendingCount > 0 || failedCount > 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        בחר קבצי מתכונים מהמחשב. נתמכים: טקסט, Word, תמונות.
      </p>

      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          בחר קבצים
        </Button>
        {hasFiles && !importing && (
          <Button variant="ghost" onClick={clearAll}>
            נקה הכל
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
      </div>

      {hasFiles && (
        <div className="space-y-2">
          {files.map((entry, i) => (
            <Card key={`${entry.file.name}-${i}`}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{statusIcon(entry.status)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.file.name}</p>
                    {entry.status === 'success' && entry.recipe && (
                      <p className="text-xs text-green-600 truncate">{entry.recipe.title}</p>
                    )}
                    {entry.status === 'failed' && entry.error && (
                      <p className="text-xs text-red-600">{entry.error}</p>
                    )}
                    {entry.status === 'processing' && (
                      <p className="text-xs text-muted-foreground">מעבד...</p>
                    )}
                  </div>
                </div>
                {entry.status !== 'processing' && !importing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(i)}
                    className="shrink-0"
                  >
                    הסר
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canImport && (
        <Button onClick={startImport} className="w-full">
          ייבא {pendingCount + failedCount} קבצים
        </Button>
      )}

      {done && (
        <Card>
          <CardContent className="p-4 text-center space-y-2">
            <p className="font-medium">
              {successCount > 0 && `${successCount} מתכונים יובאו בהצלחה`}
              {successCount > 0 && failedCount > 0 && ', '}
              {failedCount > 0 && `${failedCount} נכשלו`}
              {successCount === 0 && failedCount === 0 && 'לא היו קבצים לעיבוד'}
            </p>
            {successCount > 0 && (
              <Link href="/recipes" className="text-primary hover:underline text-sm">
                צפה במתכונים
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
