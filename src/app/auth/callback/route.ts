import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/recipes'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure user profile exists (for OAuth and email-confirmed users)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const adminSupabase = createAdminClient()
        const { data: existing } = await adminSupabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          // Profile doesn't exist yet — create it and notify admin
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
          await fetch(`${appUrl}/api/auth/on-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, email: user.email }),
          }).catch((err) => console.error('[callback] on-signup call failed:', err))
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
