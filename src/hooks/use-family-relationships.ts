'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PendingFamilyRequest {
  id: string
  requester_email: string
  requester_name: string
  created_at: string
}

export interface FamilyMember {
  id: string
  user_id: string
  email: string
  name: string
  created_at: string
}

export interface OutgoingFamilyRequest {
  id: string
  addressee_email: string
  addressee_name: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export function useFamilyRelationships() {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState<PendingFamilyRequest[]>([])
  const [acceptedMembers, setAcceptedMembers] = useState<FamilyMember[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingFamilyRequest[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/family-relationships/pending')
      if (!res.ok) return
      const data = await res.json()
      setPendingCount(data.count)
      setPendingRequests(data.pending)
    } catch {
      // silently fail
    }
  }, [])

  const fetchAccepted = useCallback(async () => {
    try {
      const res = await fetch('/api/family-relationships/accepted')
      if (!res.ok) return
      const data = await res.json()
      setAcceptedMembers(data.members)
    } catch {
      // silently fail
    }
  }, [])

  const fetchOutgoing = useCallback(async () => {
    try {
      const res = await fetch('/api/family-relationships')
      if (!res.ok) return
      const data = await res.json()
      setOutgoingRequests(data.relationships)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  async function inviteFamily(email: string): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch('/api/family-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await Promise.all([fetchOutgoing(), fetchAccepted()])
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה בשליחת הבקשה' }
    } finally {
      setLoading(false)
    }
  }

  async function respondToInvite(id: string, action: 'accept' | 'decline'): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch(`/api/family-relationships/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await Promise.all([fetchPending(), fetchAccepted()])
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה בעדכון' }
    } finally {
      setLoading(false)
    }
  }

  async function removeFamily(id: string): Promise<{ success: boolean; error?: string }> {
    setLoading(true)
    try {
      const res = await fetch(`/api/family-relationships/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message }
      await Promise.all([fetchAccepted(), fetchOutgoing()])
      return { success: true }
    } catch {
      return { success: false, error: 'שגיאה במחיקה' }
    } finally {
      setLoading(false)
    }
  }

  return {
    pendingCount,
    pendingRequests,
    acceptedMembers,
    outgoingRequests,
    loading,
    fetchPending,
    fetchAccepted,
    fetchOutgoing,
    inviteFamily,
    respondToInvite,
    removeFamily,
  }
}
