import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractWithAI } from '@/lib/ai/parse-recipe-url'
import { translateRecipe } from '@/lib/ai/translate'
import { isHebrew } from '@/lib/ai/translate'
import { z } from 'zod'

export const maxDuration = 60

const parseTextRequestSchema = z.object({
  text: z.string().min(1),
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
