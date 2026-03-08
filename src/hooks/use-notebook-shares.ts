'use client'

import { useState, useEffect, useCallback } from 'react'

interface PendingShare {
  id: string
  owner_email: string
  owner_name: string
  created_at: string
}

interface ReceivedShare {
  id: string
  owner_id: string
  owner_email: string
  owner_name: string
  status: 'approved' | 'hidden'
  created_at: string
}

interface OutgoingShare {
  id: string
  shared_with_email: string
  status: 'pending' | 'approved' | 'declined' | 'hidden'
  created_at: string
}

export function useNotebookShares() {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingShares, setPendingShares] = useState<PendingShare[]>([])
  const [receivedShares, setReceivedShares] = useState<ReceivedShare[]>([])
  const [outgoingShares, setOutgoingShares] = useState<OutgoingShare[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/notebook-shares/pending')
      if (!res.ok) return
      const data = await res.json()
      setPendingCount(data.count)
      setPendingShares(data.pending)
    } catch {
      // silently fail
    }
  }, [])

  const fetchReceived = useCallback(async () => {
    try {
      const res = await fetch('/api/notebook-shares/received')
      if (!res.ok) return
      const data = await res.json()
      setReceivedShares(data.shares)
    } catch {
      // silently fail
    }
  }, [])

  const fetchOutgoing = useCallback(async () => {
    try {
      const res = await fetch('/api/notebook-shares')
      if (!res.ok) return
      const data = await res.json()
      setOutgoingShares(data.shares)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  async function shareNotebook(email: string): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch('/api/notebook-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await fetchOutgoing()
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה בשיתוף' }
    } finally {
      setLoading(false)
    }
  }

  async function updateShare(id: string, action: 'approve' | 'decline' | 'hide' | 'unhide'): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch(`/api/notebook-shares/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await fetchPending()
      await fetchReceived()
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה בעדכון' }
    } finally {
      setLoading(false)
    }
  }

  async function removeShare(id: string): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch(`/api/notebook-shares/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await fetchReceived()
      await fetchOutgoing()
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה במחיקה' }
    } finally {
      setLoading(false)
    }
  }

  return {
    pendingCount,
    pendingShares,
    receivedShares,
    outgoingShares,
    loading,
    fetchPending,
    fetchReceived,
    fetchOutgoing,
    shareNotebook,
    updateShare,
    removeShare,
  }
}
