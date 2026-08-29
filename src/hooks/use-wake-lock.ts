'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

function subscribeNever() {
  return () => {}
}

/**
 * Holds a screen wake lock while `enabled` is true, so the device screen
 * doesn't dim or lock (e.g. while a recipe is open during cooking).
 *
 * The browser drops the lock whenever the page becomes hidden, so the lock is
 * re-acquired on every return to visibility. `active` reflects the real lock
 * state, which can be false even when enabled (Low Power Mode, low battery).
 */
export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  // Read on the client only: the server has no navigator, and reading during
  // hydration would mismatch. Support can't change during a session.
  const supported = useSyncExternalStore(
    subscribeNever,
    useCallback(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator, []),
    useCallback(() => false, [])
  )

  useEffect(() => {
    if (!enabled || !supported) return

    let cancelled = false

    async function acquire() {
      if (cancelled) return
      if (document.visibilityState !== 'visible') return
      if (sentinelRef.current && !sentinelRef.current.released) return

      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release().catch(() => {})
          return
        }
        sentinelRef.current = sentinel
        setActive(true)
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null
          setActive(false)
        })
      } catch {
        // Rejected by the platform (not visible, Low Power Mode, low battery).
        setActive(false)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      setActive(false)
      sentinel?.release().catch(() => {})
    }
  }, [enabled, supported])

  return { supported, active }
}
