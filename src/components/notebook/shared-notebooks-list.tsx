'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotebookShares } from '@/hooks/use-notebook-shares'

interface SharedNotebooksListProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SharedNotebooksList({ open, onOpenChange }: SharedNotebooksListProps) {
  const { receivedShares, fetchReceived, updateShare, removeShare, loading } = useNotebookShares()
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchReceived()
    }
  }, [open, fetchReceived])

  async function handleToggleVisibility(id: string, currentStatus: string) {
    const action = currentStatus === 'approved' ? 'hide' : 'unhide'
    const result = await updateShare(id, action as 'hide' | 'unhide')
    if (result.success) {
      toast.success(action === 'hide' ? 'המחברת הוסתרה' : 'המחברת מוצגת שוב')
    } else {
      toast.error(result.error || 'שגיאה')
    }
  }

  async function handleRemove() {
    if (!confirmRemoveId) return
    const result = await removeShare(confirmRemoveId)
    setConfirmRemoveId(null)
    if (result.success) {
      toast.success('המחברת הוסרה')
    } else {
      toast.error(result.error || 'שגיאה בהסרה')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>מחברות משותפות</DialogTitle>
        </DialogHeader>

        {receivedShares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            אין מחברות משותפות
          </p>
        ) : (
          <ul className="space-y-3">
            {receivedShares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{share.owner_name}</p>
                    <Badge variant={share.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                      {share.status === 'approved' ? 'מוצג' : 'מוסתר'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{share.owner_email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleToggleVisibility(share.id, share.status)}
                    disabled={loading}
                    title={share.status === 'approved' ? 'הסתר' : 'הצג'}
                  >
                    {share.status === 'approved' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setConfirmRemoveId(share.id)}
                    disabled={loading}
                    title="הסר לצמיתות"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>

      <AlertDialog open={!!confirmRemoveId} onOpenChange={(open) => { if (!open) setConfirmRemoveId(null) }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>הסרת מחברת משותפת</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תסיר את המחברת לצמיתות. כדי לראות אותה שוב, הבעלים יצטרך לשתף מחדש.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>הסר</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
