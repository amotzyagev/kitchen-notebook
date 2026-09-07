'use client'
import Link from 'next/link'
import { ShoppingBasket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useShopping } from './shopping-provider'
export function ShoppingLink() {
  const { state } = useShopping()
  const count = state.document.sources.length
  return <Button asChild variant="ghost" size="icon" className="relative shrink-0">
    <Link href="/shopping-list" aria-label={`רשימת קניות, ${count} מרכיבים שנבחרו`} title="רשימת קניות">
      <ShoppingBasket className="size-5" />
      {count > 0 && <span className="absolute -top-1 -end-1 bg-primary text-primary-foreground rounded-full px-1 min-w-4 text-[10px]">{count > 99 ? '99+' : count}</span>}
    </Link>
  </Button>
}
