import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRecipeFile } from '@/lib/ai/parse-recipe-file'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const maxDuration = 60

const parseFileRequestSchema = z.object({
  fileBase64: z.string().min(1),
  filename: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר כדי להשתמש בתכונה זו' },
        { status: 401 }
      )
    }

    // Rate limit check
    const { success: withinLimit } = rateLimit(user.id, 10)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', message: 'בקשה לא תקינה' },
        { status: 400 }
      )
    }

    const parseResult = parseFileRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'חסרים נתוני קובץ' },
        { status: 400 }
      )
    }

    const { fileBase64, filename } = parseResult.data

    // Check size < 10MB
    const fileSizeBytes = fileBase64.length * 0.75
    if (fileSizeBytes > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'הקובץ גדול מדי (מקסימום 10MB)' },
        { status: 413 }
      )
    }

    const result = await parseRecipeFile(fileBase64, filename)

    if (!result.is_recipe) {
      return NextResponse.json(
        { error: 'not_a_recipe', message: `לא זיהיתי מתכון בקובץ: ${filename}` },
        { status: 422 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Parse file error:', error)
    const message = error instanceof Error ? error.message : 'שגיאה בעיבוד הקובץ'
    return NextResponse.json(
      { error: 'parse_failed', message },
      { status: 500 }
    )
  }
}
