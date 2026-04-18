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
import { Badge } from '@/components/ui/badge'
import { useNotebookShares } from '@/hooks/use-notebook-shares'
import { useFamilyRelationships } from '@/hooks/use-family-relationships'

interface PendingInvitationsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PendingInvitations({ open, onOpenChange }: PendingInvitationsProps) {
  const { pendingShares, fetchPending: fetchSharesPending, updateShare, loading: sharesLoading } = useNotebookShares()
  const { pendingRequests, fetchPending: fetchFamilyPending, respondToInvite, loading: familyLoading } = useFamilyRelationships()

  const loading = sharesLoading || familyLoading

  useEffect(() => {
    if (open) {
      fetchSharesPending()
      fetchFamilyPending()
    }
  }, [open, fetchSharesPending, fetchFamilyPending])

  async function handleShareAction(id: string, action: 'approve' | 'decline') {
    const result = await updateShare(id, action)
    if (result.success) {
      toast.success(action === 'approve' ? 'המחברת אושרה!' : 'ההזמנה נדחתה')
    } else {
      toast.error(result.error || 'שגיאה')
    }
  }

  async function handleFamilyAction(id: string, action: 'accept' | 'decline') {
    const result = await respondToInvite(id, action)
    if (result.success) {
      toast.success(action === 'accept' ? 'בקשת המשפחה אושרה!' : 'הבקשה נדחתה')
    } else {
      toast.error(result.error || 'שגיאה')
    }
  }

  const totalCount = pendingShares.length + pendingRequests.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>הזמנות ממתינות</DialogTitle>
        </DialogHeader>

        {totalCount === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            אין הזמנות ממתינות
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingShares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{share.owner_name}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">מחברת</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{share.owner_email}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleShareAction(share.id, 'approve')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 me-1" />}
                    אשר
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareAction(share.id, 'decline')}
                    disabled={loading}
                  >
                    <X className="size-4 me-1" />
                    דחה
                  </Button>
                </div>
              </li>
            ))}

            {pendingRequests.map((req) => (
              <li key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{req.requester_name}</p>
                    <Badge variant="outline" className="text-xs shrink-0">משפחה</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{req.requester_email}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleFamilyAction(req.id, 'accept')}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 me-1" />}
                    אשר
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFamilyAction(req.id, 'decline')}
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
