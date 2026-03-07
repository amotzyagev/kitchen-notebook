import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר' },
        { status: 401 }
      )
    }

    // Verify recipe ownership
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (!recipe) {
      return NextResponse.json(
        { error: 'not_found', message: 'מתכון לא נמצא' },
        { status: 404 }
      )
    }

    // Get shares with user emails
    const { data: shares } = await supabase
      .from('recipe_shares')
      .select('id, shared_with_user_id, created_at')
      .eq('recipe_id', recipeId)
      .eq('owner_id', user.id)

    if (!shares?.length) {
      return NextResponse.json({ shares: [] })
    }

    // Get emails for shared users
    const userIds = shares.map(s => s.shared_with_user_id)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds)

    const emailMap = new Map(profiles?.map(p => [p.id, p.email]) ?? [])

    const result = shares.map(s => ({
      id: s.id,
      email: emailMap.get(s.shared_with_user_id) ?? '',
      created_at: s.created_at,
    }))

    return NextResponse.json({ shares: result })
  } catch (error) {
    console.error('[shares] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בשרת' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר' },
        { status: 401 }
      )
    }

    const { sharedWithUserId } = await request.json() as { sharedWithUserId: string }

    if (!sharedWithUserId) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'חסרים פרטים' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('recipe_shares')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('owner_id', user.id)
      .eq('shared_with_user_id', sharedWithUserId)

    if (deleteError) {
      console.error('[shares] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'delete_failed', message: 'שגיאה בביטול שיתוף' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[shares] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בשרת' },
      { status: 500 }
    )
  }
}
