import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

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
