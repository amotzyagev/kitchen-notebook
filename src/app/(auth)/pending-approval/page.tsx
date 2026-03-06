import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">ממתין לאישור</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            החשבון שלך ממתין לאישור מנהל. תקבל גישה ברגע שהחשבון יאושר.
          </p>
          <p className="text-sm text-muted-foreground">
            ניתן לרענן את הדף כדי לבדוק אם החשבון אושר.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
