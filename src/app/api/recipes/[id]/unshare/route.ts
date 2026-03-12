import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-utils'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { error: deleteError } = await supabase
      .from('recipe_shares')
      .delete()
      .eq('recipe_id', recipeId)
      .eq('shared_with_user_id', user.id)

    if (deleteError) {
      console.error('[unshare] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'delete_failed', message: 'שגיאה בהסרת השיתוף' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[unshare] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בשרת' },
      { status: 500 }
    )
  }
}
