import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { ERROR_RATE_LIMIT, ERROR_SERVER } from '@/lib/constants/error-messages'
import { z } from 'zod'

const shareSchema = z.object({
  recipeIds: z.array(z.string().uuid()).min(1).max(100),
  email: z.string().trim().email(),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { success: withinLimit, retryAfterSeconds } = await rateLimit('share', user.id)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: ERROR_RATE_LIMIT },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      )
    }

    const parsed = shareSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'חסרים פרטים' },
        { status: 400 }
      )
    }
    const { email } = parsed.data
    const recipeIds = [...new Set(parsed.data.recipeIds)]

    // Check ownership before looking up the recipient. Do not silently skip
    // recipes the caller cannot share or report database failures as success.
    const { data: ownedRecipes, error: ownershipError } = await supabase
      .from('recipes').select('id').in('id', recipeIds).eq('user_id', user.id)
    if (ownershipError) throw ownershipError
    if (ownedRecipes?.length !== recipeIds.length) {
      return NextResponse.json(
        { error: 'forbidden', message: 'ניתן לשתף רק מתכונים שבבעלותך' },
        { status: 403 }
      )
    }

    // Look up target user by email (admin client bypasses RLS)
    const admin = createAdminClient()
    const { data: targetProfile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    // Silently succeed if user not found (don't reveal if email exists)
    if (!targetProfile) {
      return NextResponse.json({ success: true, shared: 0 })
    }

    // Can't share with yourself
    if (targetProfile.id === user.id) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'לא ניתן לשתף עם עצמך' },
        { status: 400 }
      )
    }

    // Create shares (upsert to handle duplicates gracefully)
    const shares = recipeIds.map(recipeId => ({
      recipe_id: recipeId,
      owner_id: user.id,
      shared_with_user_id: targetProfile.id,
    }))

    const { error: insertError } = await supabase
      .from('recipe_shares')
      .upsert(shares, { onConflict: 'recipe_id,shared_with_user_id' })

    if (insertError) {
      console.error('[share] Insert error:', insertError)
      return NextResponse.json(
        { error: 'share_failed', message: 'שגיאה בשיתוף' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, shared: recipeIds.length })
  } catch (error) {
    console.error('[share] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
