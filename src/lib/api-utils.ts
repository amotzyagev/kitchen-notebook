import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type AuthResult = { supabase: SupabaseClient, user: { id: string, email?: string } }
type AuthError = NextResponse

export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'יש להתחבר כדי להשתמש בתכונה זו' },
      { status: 401 }
    )
  }
  return { supabase, user }
}

export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  if (result.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json(
      { error: 'forbidden', message: 'אין הרשאה' },
      { status: 403 }
    )
  }
  return result
}
