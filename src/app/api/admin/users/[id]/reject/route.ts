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

    // Delete the profile and the auth user
    const adminSupabase = createAdminClient()

    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Also delete the auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(id)
    if (authError) {
      console.error('Failed to delete auth user:', authError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reject user error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
