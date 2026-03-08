'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 block md:hidden">
      {/* Frosted glass bar */}
      <div className="border-t border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-around relative">
          {/* Home / Recipes */}
          <Link
            href="/recipes"
            className={cn(
              'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 text-xs transition-colors',
              pathname === '/recipes'
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
              <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>מתכונים</span>
          </Link>

          {/* FAB Add Button - elevated above the bar */}
          <Link
            href="/recipes/new"
            className={cn(
              'flex items-center justify-center size-14 -mt-7 rounded-full shadow-lg transition-all active:scale-95',
              'bg-primary text-primary-foreground hover:brightness-110'
            )}
            aria-label="הוסף מתכון"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </Link>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              setTimeout(() => {
                document.querySelector<HTMLInputElement>('input[placeholder*="חיפוש"]')?.focus()
              }, 300)
            }}
            className={cn(
              'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 text-xs transition-colors',
              'text-muted-foreground'
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>חיפוש</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
