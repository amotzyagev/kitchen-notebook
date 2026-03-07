'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface ExportButtonProps {
  recipeIds: string[]
}

export function ExportButton({ recipeIds }: ExportButtonProps) {
  function handleClick() {
    window.open(`/recipes/print?ids=${recipeIds.join(',')}`, '_blank')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      aria-label="ייצוא / הדפסה"
    >
      <Printer className="size-4 me-2" />
      הדפסה
    </Button>
  )
}
