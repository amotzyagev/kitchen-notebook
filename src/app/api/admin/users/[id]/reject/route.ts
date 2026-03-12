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
