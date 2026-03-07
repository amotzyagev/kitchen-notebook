'use client'

import { useState } from 'react'
import { Share2, Printer, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ShareDialogProps {
  recipeIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDialog({ recipeIds, open, onOpenChange }: ShareDialogProps) {
  const [email, setEmail] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  async function handleShare() {
    if (!email.trim()) return

    setIsSharing(true)
    try {
      const res = await fetch('/api/recipes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeIds, email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'שגיאה בשיתוף')
        return
      }

      if (data.shared === 0) {
        toast.info('השיתוף בוצע בהצלחה')
      } else {
        toast.success(`שותפו ${data.shared} מתכונים בהצלחה`)
      }
      setEmail('')
      onOpenChange(false)
    } catch {
      toast.error('שגיאה בשיתוף המתכונים')
    } finally {
      setIsSharing(false)
    }
  }

  function handleExport() {
    window.open(`/recipes/print?ids=${recipeIds.join(',')}`, '_blank')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>שיתוף מתכונים</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="share">
          <TabsList>
            <TabsTrigger value="share">שיתוף למשתמש</TabsTrigger>
            <TabsTrigger value="export">ייצוא</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              הזן את כתובת האימייל של המשתמש שברצונך לשתף איתו
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleShare()
                }}
                dir="ltr"
                className="text-left"
              />
              <Button onClick={handleShare} disabled={isSharing || !email.trim()}>
                {isSharing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4 me-2" />
                )}
                {isSharing ? 'משתף...' : 'שתף'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              פתח את המתכונים בדף הדפסה
            </p>
            <Button variant="outline" onClick={handleExport}>
              <Printer className="size-4 me-2" />
              הדפסה ({recipeIds.length})
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
