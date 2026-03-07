import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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
