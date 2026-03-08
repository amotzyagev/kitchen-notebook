'use client'

import { useEffect } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNotebookShares } from '@/hooks/use-notebook-shares'

interface PendingInvitationsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PendingInvitations({ open, onOpenChange }: PendingInvitationsProps) {
  const { pendingShares, fetchPending, updateShare, loading } = useNotebookShares()

  useEffect(() => {
    if (open) {
      fetchPending()
    }
  }, [open, fetchPending])

  async function handleAction(id: string, action: 'approve' | 'decline') {
    const result = await updateShare(id, action)
    if (result.success) {
      toast.success(action === 'approve' ? 'המחברת אושרה!' : 'ההזמנה נדחתה')
    } else {
      toast.error(result.error || 'שגיאה')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>הזמנות ממתינות</DialogTitle>
        </DialogHeader>

        {pendingShares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            אין הזמנות ממתינות
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingShares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{share.owner_name}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{share.owner_email}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAction(share.id, 'approve')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 me-1" />}
                    אשר
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(share.id, 'decline')}
                    disabled={loading}
                  >
                    <X className="size-4 me-1" />
                    דחה
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
