import { NextResponse } from 'next/server'
import { resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { data: relationships, error } = await supabase
      .from('family_relationships')
      .select('id, requester_id, created_at')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[family-relationships/pending] Fetch error:', error)
      return NextResponse.json(
        { error: 'fetch_failed', message: 'שגיאה בטעינה' },
        { status: 500 }
      )
    }

    const pending = await Promise.all(
      (relationships ?? []).map(async (rel) => {
        const info = await resolveUserDisplayInfo(rel.requester_id)
        return {
          id: rel.id,
          requester_email: info.email,
          requester_name: info.name,
          created_at: rel.created_at,
        }
      })
    )

    return NextResponse.json({ pending, count: pending.length })
  } catch (error) {
    console.error('[family-relationships/pending] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
