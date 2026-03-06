import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">איפוס סיסמה</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ForgotPasswordForm />
          <div className="text-center text-sm">
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              חזרה להתחברות
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
