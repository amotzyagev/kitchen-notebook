import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-utils'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify admin
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('user_profiles')
      .update({ approved: true })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve user error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
