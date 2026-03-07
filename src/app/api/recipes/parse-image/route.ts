import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseImageRequestSchema } from '@/lib/validators/api'
import { parseRecipeImage } from '@/lib/ai/parse-recipe-image'
import { rateLimit } from '@/lib/rate-limit'

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

    // Rate limit check
    const { success: withinLimit } = rateLimit(user.id, 10)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
        { status: 429 }
      )
    }

    // 2. Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'missing_image', message: 'חסרים נתוני תמונה' },
        { status: 400 }
      )
    }

    // 3. Validate with parseImageRequestSchema
    const parseResult = parseImageRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'missing_image', message: 'חסרים נתוני תמונה' },
        { status: 400 }
      )
    }

    const { imageBase64, mediaType } = parseResult.data

    // 4. Check base64 size < 5MB (base64 string length * 0.75 = bytes)
    const imageSizeBytes = imageBase64.length * 0.75
    const maxSizeBytes = 5 * 1024 * 1024 // 5MB
    if (imageSizeBytes > maxSizeBytes) {
      return NextResponse.json(
        { error: 'image_too_large', message: 'התמונה גדולה מדי' },
        { status: 413 }
      )
    }

    // 5. Call parseRecipeImage
    const result = await parseRecipeImage(imageBase64, mediaType)

    // 6. Check if it's actually a recipe
    if (!result.is_recipe) {
      return NextResponse.json(
        { error: 'not_a_recipe', message: 'לא זיהיתי מתכון בתמונה' },
        { status: 422 }
      )
    }

    // 7. Return JSON response
    return NextResponse.json(result)
  } catch (error) {
    console.error('Parse image error:', error)
    return NextResponse.json(
      { error: 'ocr_failed', message: 'שגיאה בזיהוי טקסט מהתמונה' },
      { status: 500 }
    )
  }
}
