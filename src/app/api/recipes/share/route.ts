import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { success: withinLimit } = rateLimit(user.id, 20)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: 'יותר מדי בקשות. נסו שוב בעוד דקה.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { recipeIds, email } = body as { recipeIds: string[]; email: string }

    if (!recipeIds?.length || !email) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'חסרים פרטים' },
        { status: 400 }
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

    // Verify ownership of all recipes
    const { data: ownedRecipes } = await supabase
      .from('recipes')
      .select('id')
      .in('id', recipeIds)
      .eq('user_id', user.id)

    const ownedIds = new Set(ownedRecipes?.map(r => r.id) ?? [])
    const validRecipeIds = recipeIds.filter(id => ownedIds.has(id))

    if (!validRecipeIds.length) {
      return NextResponse.json({ success: true, shared: 0 })
    }

    // Create shares (upsert to handle duplicates gracefully)
    const shares = validRecipeIds.map(recipeId => ({
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

    return NextResponse.json({ success: true, shared: validRecipeIds.length })
  } catch (error) {
    console.error('[share] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בשרת' },
      { status: 500 }
    )
  }
}
