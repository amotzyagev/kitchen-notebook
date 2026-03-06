import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SignupForm } from '@/components/auth/signup-form'
import { OAuthButtons } from '@/components/auth/oauth-buttons'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">הרשמה</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SignupForm />
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">או</span>
            <Separator className="flex-1" />
          </div>
          <OAuthButtons />
          <div className="text-center text-sm">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              יש לך חשבון? התחבר
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
