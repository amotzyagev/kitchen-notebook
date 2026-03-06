import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

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
