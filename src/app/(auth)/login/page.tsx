import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/login-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">התחברות</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <LoginForm />
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">או</span>
            <Separator className="flex-1" />
          </div>
          <OAuthButtons />
          <div className="grid gap-2 text-center text-sm">
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              אין לך חשבון? הירשם
            </Link>
            <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
              שכחת סיסמה?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
