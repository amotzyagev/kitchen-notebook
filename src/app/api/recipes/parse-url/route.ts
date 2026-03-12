import { NextResponse } from 'next/server'
import { parseUrlRequestSchema } from '@/lib/validators/api'
import { parseRecipeUrl } from '@/lib/ai/parse-recipe-url'
import { translateRecipe } from '@/lib/ai/translate'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    // 1. Verify auth
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

    // 5. Add source domain as a tag
    try {
      const hostname = new URL(url).hostname.replace(/^(www|mobile|m|app)\./, '')
      // Extract site name: strip common TLDs and country codes
      const domain = hostname
        .replace(/\.(com|org|net|io|co|me|info|biz)?\.(il|uk|au|nz|za|in|br|de|fr|es|it|nl|se|no|dk|fi|jp|kr|cn|ru|pl|cz|at|ch|be|pt|ie|ca|mx|ar|cl|co|tv|ai)$/, '')
        .replace(/\.(com|org|net|io|co|me|info|biz|dev|app|xyz|site|online|store|shop|blog|tech|design|agency|studio|media|cloud|space|world|life|live|news|today|pro|guru|works|solutions|digital|global|group|team|zone|plus|one|top|edu|gov|mil|int)$/, '')
      if (domain && !translatedResult.tags.some(t => t.toLowerCase() === domain.toLowerCase())) {
        translatedResult.tags.push(domain)
      }
    } catch {
      // ignore invalid URL
    }

    // 6. Return translated result
    return NextResponse.json(translatedResult)
  } catch (error) {
    console.error('Parse URL error:', error)
    return NextResponse.json(
      { error: 'ai_error', message: 'שגיאה בעיבוד המתכון' },
      { status: 500 }
    )
  }
}
