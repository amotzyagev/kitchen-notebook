'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { emptyDocument, type ShoppingState } from '@/lib/shopping-list'

export class ShoppingError extends Error {
  constructor(message: string, public code?: string) { super(message) }
}
type ShoppingContextType = {
  state: ShoppingState; loading: boolean; busy: boolean; error: string
  refresh: () => Promise<void>; mutate: (action: Record<string, unknown>) => Promise<ShoppingState>
}
const Context = createContext<ShoppingContextType | null>(null)
export function ShoppingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ShoppingState>({ version: 0, document: emptyDocument() })
  const stateRef = useRef(state)
  const lock = useRef(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (lock.current) return
    try {
      const res = await fetch('/api/shopping-list', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      if (!lock.current && data.version >= stateRef.current.version) { stateRef.current = data; setState(data); setError('') }
    } catch (e) { setError(e instanceof Error ? e.message : 'טעינת הרשימה נכשלה') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    void refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])
  const mutate = async (action: Record<string, unknown>) => {
    if (lock.current) throw new ShoppingError('שמירה מתבצעת. נסו שוב בעוד רגע.')
    lock.current = true; setBusy(true)
    try {
      const res = await fetch('/api/shopping-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, version: stateRef.current.version }) })
      const data = await res.json()
      if (!res.ok) throw new ShoppingError(data.message, data.code)
      stateRef.current = data; setState(data); setError('')
      return data as ShoppingState
    } catch (e) { throw e instanceof Error ? e : new ShoppingError('השמירה נכשלה. נסו שוב.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Context.Provider value={{ state, loading, busy, error, refresh, mutate }}>{children}</Context.Provider>
}
export function useShopping() {
  const context = useContext(Context)
  if (!context) throw new Error('ShoppingProvider is missing')
  return context
}
