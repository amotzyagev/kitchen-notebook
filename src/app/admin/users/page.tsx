'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface UserProfile {
  id: string
  email: string
  approved: boolean
  created_at: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      setUsers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  async function handleApprove(id: string) {
    setActionLoading(id)
    await fetch(`/api/admin/users/${id}/approve`, { method: 'POST' })
    await fetchUsers()
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    if (!confirm('האם למחוק את המשתמש?')) return
    setActionLoading(id)
    await fetch(`/api/admin/users/${id}/reject`, { method: 'POST' })
    await fetchUsers()
    setActionLoading(null)
  }

  const pending = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    אשר
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(user.id)}
                    disabled={actionLoading === user.id}
                  >
                    דחה
                  </Button>
                </div>
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
