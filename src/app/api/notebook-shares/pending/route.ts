import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveUserDisplayInfo } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר' },
        { status: 401 }
      )
    }

    const { data: shares, error } = await supabase
      .from('notebook_shares')
      .select('id, owner_id, created_at')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[notebook-shares/pending] Fetch error:', error)
      return NextResponse.json(
        { error: 'fetch_failed', message: 'שגיאה בטעינה' },
        { status: 500 }
      )
    }

    const pending = await Promise.all(
      (shares ?? []).map(async (share) => {
        const info = await resolveUserDisplayInfo(share.owner_id)
        return {
          id: share.id,
          owner_email: info.email,
          owner_name: info.name,
          created_at: share.created_at,
        }
      })
    )

    return NextResponse.json({ pending, count: pending.length })
  } catch (error) {
    console.error('[notebook-shares/pending] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בשרת' },
      { status: 500 }
    )
  }
}
