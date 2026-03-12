import { NextResponse } from 'next/server'
import { extractWithAI } from '@/lib/ai/parse-recipe-url'
import { translateRecipe } from '@/lib/ai/translate'
import { isHebrew } from '@/lib/ai/translate'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

export const maxDuration = 60

const parseTextRequestSchema = z.object({
  text: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

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

    const parseResult = parseTextRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'חסר טקסט' },
        { status: 400 }
      )
    }

    const { text } = parseResult.data

    const extraction = await extractWithAI(text)

    if (!extraction.is_recipe) {
      return NextResponse.json(
        { error: 'not_a_recipe', message: 'לא זיהיתי מתכון בטקסט' },
        { status: 422 }
      )
    }

    const sampleText = [extraction.title, ...extraction.ingredients.slice(0, 3)].join(' ')
    if (!isHebrew(sampleText)) {
      const translated = await translateRecipe(extraction)
      return NextResponse.json(translated)
    }

    return NextResponse.json(extraction)
  } catch (error) {
    console.error('Parse text error:', error)
    return NextResponse.json(
      { error: 'parse_failed', message: 'שגיאה בעיבוד הטקסט' },
      { status: 500 }
    )
  }
}
