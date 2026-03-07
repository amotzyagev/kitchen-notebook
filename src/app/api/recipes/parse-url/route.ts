import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseUrlRequestSchema } from '@/lib/validators/api'
import { parseRecipeUrl } from '@/lib/ai/parse-recipe-url'
import { translateRecipe } from '@/lib/ai/translate'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    // 1. Verify auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר כדי להשתמש בתכונה זו' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'invalid_url', message: 'כתובת URL לא תקינה' },
        { status: 400 }
      )
    }

    const parseResult = parseUrlRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'invalid_url', message: 'כתובת URL לא תקינה' },
        { status: 400 }
      )
    }

    const { url } = parseResult.data
    console.log('[parse-url] Starting extraction for:', url)

    // 3. Extract recipe from URL
    let extractedData
    try {
      extractedData = await parseRecipeUrl(url)
      console.log('[parse-url] Extraction result:', JSON.stringify({
        is_recipe: extractedData.is_recipe,
        confidence: extractedData.confidence,
        title: extractedData.title?.slice(0, 50),
        ingredientsCount: extractedData.ingredients?.length,
      }))
    } catch (error) {
      console.error('[parse-url] Extraction error:', error instanceof Error ? error.message : error)
      console.error('[parse-url] Error stack:', error instanceof Error ? error.stack : 'no stack')
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'timeout', message: 'הבקשה נמשכה זמן רב מדי' },
          { status: 504 }
        )
      }
      const message = error instanceof Error && error.message.includes('חוסם')
        ? error.message
        : 'לא הצלחתי לחלץ מתכון מהדף'
      return NextResponse.json(
        { error: 'extraction_failed', message },
        { status: 422 }
      )
    }

    if (!extractedData.is_recipe) {
      console.log('[parse-url] Content not recognized as recipe')
      return NextResponse.json(
        { error: 'extraction_failed', message: 'לא הצלחתי לחלץ מתכון מהדף' },
        { status: 422 }
      )
    }

    // 4. Translate to Hebrew
    console.log('[parse-url] Translating to Hebrew...')
    const translatedResult = await translateRecipe(extractedData)

    // 5. Return translated result
    return NextResponse.json(translatedResult)
  } catch (error) {
    console.error('Parse URL error:', error)
    return NextResponse.json(
      { error: 'ai_error', message: 'שגיאה בעיבוד המתכון' },
      { status: 500 }
    )
  }
}
