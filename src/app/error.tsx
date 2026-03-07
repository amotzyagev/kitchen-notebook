'use client'

import Link from 'next/link'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-[var(--font-display)]">שגיאה</h1>
      <p className="text-muted-foreground">{error.message || 'משהו השתבש. נסה שוב.'}</p>
      <div className="flex gap-4">
        <button onClick={reset} className="rounded bg-primary px-4 py-2 text-primary-foreground">
          נסה שוב
        </button>
        <Link href="/recipes" className="rounded border px-4 py-2">
          חזרה למתכונים
        </Link>
      </div>
    </div>
  )
}
