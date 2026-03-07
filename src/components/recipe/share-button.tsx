'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareDialog } from './share-dialog'

interface ShareButtonProps {
  recipeIds: string[]
}

export function ShareButton({ recipeIds }: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="size-4 me-2" />
        שיתוף
      </Button>
      <ShareDialog recipeIds={recipeIds} open={open} onOpenChange={setOpen} />
    </>
  )
}
