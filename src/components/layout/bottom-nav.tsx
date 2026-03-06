'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background block md:hidden">
      <div className="flex items-center justify-around">
        <Link
          href="/recipes"
          className={cn(
            'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 text-xs',
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
        <Link
          href="/recipes/new"
          className={cn(
            'flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 text-xs',
            pathname === '/recipes/new'
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
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>הוספה</span>
        </Link>
      </div>
    </nav>
  )
}
