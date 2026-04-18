import { NextResponse } from 'next/server'
import { createAdminClient, resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    // Use admin client to query both directions in one go
    const admin = createAdminClient()

    const [{ data: asRequester }, { data: asAddressee }] = await Promise.all([
      admin
        .from('family_relationships')
        .select('id, addressee_id, created_at')
        .eq('requester_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false }),
      admin
        .from('family_relationships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false }),
    ])

    const allRelationships = [
      ...(asRequester ?? []).map((r) => ({ id: r.id, other_user_id: r.addressee_id, created_at: r.created_at })),
      ...(asAddressee ?? []).map((r) => ({ id: r.id, other_user_id: r.requester_id, created_at: r.created_at })),
    ]

    const members = await Promise.all(
      allRelationships.map(async (rel) => {
        const info = await resolveUserDisplayInfo(rel.other_user_id)
        return {
          id: rel.id,
          user_id: rel.other_user_id,
          email: info.email,
          name: info.name,
          created_at: rel.created_at,
        }
      })
    )

    return NextResponse.json({ members })
  } catch (error) {
    console.error('[family-relationships/accepted] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
