import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-utils'

export async function GET() {
  try {
    // Verify admin
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Fetch all user profiles using admin client
    const adminSupabase = createAdminClient()
    const { data: profiles, error } = await adminSupabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
