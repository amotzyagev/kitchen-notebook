import { NextResponse } from 'next/server'
import { parseImageRequestSchema } from '@/lib/validators/api'
import { parseRecipeImage } from '@/lib/ai/parse-recipe-image'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { ERROR_RATE_LIMIT, ERROR_NOT_A_RECIPE_IMAGE } from '@/lib/constants/error-messages'

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
        { error: 'rate_limit', message: ERROR_RATE_LIMIT },
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
        { error: 'not_a_recipe', message: ERROR_NOT_A_RECIPE_IMAGE },
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
