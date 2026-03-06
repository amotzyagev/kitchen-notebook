'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function OAuthButtons() {
  const handleGoogleLogin = () => {
    const supabase = createClient()
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="grid gap-2">
      <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
        התחבר עם Google
      </Button>
    </div>
  )
}
