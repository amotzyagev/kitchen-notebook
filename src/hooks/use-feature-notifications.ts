'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FEATURE_NOTIFICATIONS, type FeatureNotification } from '@/lib/feature-notifications'

export function useFeatureNotifications() {
  const [seenIds, setSeenIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/feature-notifications')
      .then((r) => r.json())
      .then((data: { seenIds?: string[] }) => {
        setSeenIds(data.seenIds ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const unseenNotifications: FeatureNotification[] = useMemo(
    () => (loaded ? FEATURE_NOTIFICATIONS.filter((n) => !seenIds.includes(n.id)) : []),
    [loaded, seenIds]
  )

  const unseenCount = unseenNotifications.length

  const markAllSeen = useCallback(async () => {
    if (unseenNotifications.length === 0) return
    const ids = unseenNotifications.map((n) => n.id)
    setSeenIds((prev) => Array.from(new Set([...prev, ...ids])))
    await fetch('/api/feature-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }, [unseenNotifications])

  return { unseenNotifications, unseenCount, markAllSeen }
}
