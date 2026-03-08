'use client'

import { useState } from 'react'
import { Share2, Loader2, X, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotebookShares } from '@/hooks/use-notebook-shares'

interface ShareNotebookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareNotebookDialog({ open, onOpenChange }: ShareNotebookDialogProps) {
  const [email, setEmail] = useState('')
  const { shareNotebook, outgoingShares, fetchOutgoing, removeShare, loading } = useNotebookShares()

  function handleOpen(isOpen: boolean) {
    onOpenChange(isOpen)
    if (isOpen) {
      fetchOutgoing()
    } else {
      setEmail('')
    }
  }

  async function handleShare() {
    const trimmed = email.trim()
    if (!trimmed) return

    const result = await shareNotebook(trimmed)
    if (result.success) {
      toast.success('המחברת שותפה בהצלחה')
      setEmail('')
    } else {
      toast.error(result.error || 'שגיאה בשיתוף')
    }
  }

  async function handleRevoke(id: string) {
    const result = await removeShare(id)
    if (result.success) {
      toast.success('השיתוף בוטל')
    } else {
      toast.error(result.error || 'שגיאה בביטול השיתוף')
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'pending': return 'ממתין'
      case 'approved': return 'מאושר'
      case 'declined': return 'נדחה'
      case 'hidden': return 'מוסתר'
      default: return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>שיתוף המחברת</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            הזינו את כתובת האימייל של המשתמש שברצונכם לשתף את כל המתכונים שלכם איתו
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
            <Button onClick={handleShare} disabled={loading || !email.trim()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4 me-2" />
              )}
              {loading ? 'משתף...' : 'שתף'}
            </Button>
          </div>

          {outgoingShares.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Users className="size-4" />
                משותף עם
              </h4>
              <ul className="space-y-2">
                {outgoingShares.map((share) => (
                  <li key={share.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span dir="ltr">{share.shared_with_email}</span>
                      <Badge variant="secondary" className="text-xs">
                        {statusLabel(share.status)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleRevoke(share.id)}
                      disabled={loading}
                      title="ביטול שיתוף"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
