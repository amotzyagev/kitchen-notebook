import { NextResponse } from 'next/server'
import { resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

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
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
