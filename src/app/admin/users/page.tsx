import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserActions } from './user-actions'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    redirect('/')
  }

  const adminSupabase = createAdminClient()
  const { data: profiles } = await adminSupabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const users = profiles ?? []
  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &rarr; חזרה למתכונים
      </Link>
      <h1 className="text-2xl font-[var(--font-display)] text-primary">ניהול משתמשים</h1>

      {/* Pending */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          ממתינים לאישור
          {pending.length > 0 && (
            <Badge variant="destructive" className="mr-2">{pending.length}</Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין משתמשים ממתינים</p>
        ) : (
          pending.map(user => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium" dir="ltr">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
                </div>
                <UserActions userId={user.id} />
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Approved */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">משתמשים מאושרים ({approved.length})</h2>
        {approved.map(user => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium" dir="ltr">{user.email}</p>
                <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
              </div>
              <Badge variant="secondary">מאושר</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
