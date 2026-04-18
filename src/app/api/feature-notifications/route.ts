import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('seen_notification_ids')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('[feature-notifications] Fetch error:', error)
      return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
    }

    return NextResponse.json({ seenIds: data?.seen_notification_ids ?? [] })
  } catch (error) {
    console.error('[feature-notifications] Error:', error)
    return NextResponse.json({ error: 'server_error', message: ERROR_SERVER }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { ids } = await request.json() as { ids: string[] }
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch existing seen IDs first, then union with new ones
    const { data: existing } = await admin
      .from('user_profiles')
      .select('seen_notification_ids')
      .eq('id', user.id)
      .single()

    const merged = Array.from(new Set([...(existing?.seen_notification_ids ?? []), ...ids]))

    const { error } = await admin
      .from('user_profiles')
      .update({ seen_notification_ids: merged })
      .eq('id', user.id)

    if (error) {
      console.error('[feature-notifications] Update error:', error)
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[feature-notifications] Error:', error)
    return NextResponse.json({ error: 'server_error', message: ERROR_SERVER }, { status: 500 })
  }
}
