'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Lightbulb, LightbulbOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWakeLock } from '@/hooks/use-wake-lock'

const STORAGE_KEY = 'kitchen-notebook:keep-awake'

function readStoredPreference(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode) - fall back to the default.
    return null
  }
}

function subscribeToStorage(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/**
 * Keeps the screen on while a recipe is open. On by default; the preference
 * is remembered across recipes. Renders nothing where the browser has no
 * Screen Wake Lock API (iPadOS below 16.4, or a non-HTTPS origin).
 */
export function KeepAwakeToggle() {
  // Stored preference, kept in sync across tabs; `null` on the server and
  // during hydration, which means the default (on).
  const stored = useSyncExternalStore(
    subscribeToStorage,
    readStoredPreference,
    useCallback(() => null, [])
  )
  const [override, setOverride] = useState<boolean | null>(null)
  const enabled = override ?? stored !== 'off'

  const { supported, active } = useWakeLock(enabled)

  function toggle() {
    const next = !enabled
    setOverride(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // The preference just won't persist.
    }
  }

  if (!supported) return null

  const unavailable = enabled && !active

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      className="h-7 px-2 text-xs gap-1"
      onClick={toggle}
      aria-pressed={enabled}
      title={
        unavailable
          ? 'לא ניתן להשאיר את המסך דולק כרגע (ייתכן שמצב חיסכון בסוללה פעיל)'
          : enabled
            ? 'המסך יישאר דולק כל עוד המתכון פתוח'
            : 'המסך ייכבה כרגיל'
      }
    >
      {enabled ? <Lightbulb className="size-3.5" /> : <LightbulbOff className="size-3.5" />}
      {unavailable ? 'מסך דולק (לא פעיל)' : enabled ? 'מסך דולק' : 'מסך נכבה'}
    </Button>
  )
}
