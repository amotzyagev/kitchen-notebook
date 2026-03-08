'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function UserActions({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  async function handleReject() {
    if (!confirm('האם למחוק את המשתמש?')) return
    setLoading(true)
    await fetch(`/api/admin/users/${userId}/reject`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={handleApprove} disabled={loading}>
        אשר
      </Button>
      <Button size="sm" variant="destructive" onClick={handleReject} disabled={loading}>
        דחה
      </Button>
    </div>
  )
}
