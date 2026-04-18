'use client'

import { useState } from 'react'
import { Heart, Loader2, X, Users } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFamilyRelationships } from '@/hooks/use-family-relationships'

interface FamilyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'ממתין'
    case 'accepted': return 'מאושר'
    case 'declined': return 'נדחה'
    default: return status
  }
}

export function FamilyDialog({ open, onOpenChange }: FamilyDialogProps) {
  const [email, setEmail] = useState('')
  const {
    acceptedMembers,
    outgoingRequests,
    fetchAccepted,
    fetchOutgoing,
    inviteFamily,
    removeFamily,
    loading,
  } = useFamilyRelationships()

  function handleOpen(isOpen: boolean) {
    onOpenChange(isOpen)
    if (isOpen) {
      fetchOutgoing()
      fetchAccepted()
    } else {
      setEmail('')
    }
  }

  async function handleInvite() {
    const trimmed = email.trim()
    if (!trimmed) return

    const result = await inviteFamily(trimmed)
    if (result.success) {
      toast.success('בקשת המשפחה נשלחה')
      setEmail('')
    } else {
      toast.error(result.error || 'שגיאה בשליחת הבקשה')
    }
  }

  async function handleRemove(id: string) {
    const result = await removeFamily(id)
    if (result.success) {
      toast.success('חבר המשפחה הוסר')
    } else {
      toast.error(result.error || 'שגיאה בהסרה')
    }
  }

  async function handleCancelRequest(id: string) {
    const result = await removeFamily(id)
    if (result.success) {
      toast.success('הבקשה בוטלה')
    } else {
      toast.error(result.error || 'שגיאה בביטול הבקשה')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="size-4" />
            משפחה
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="invite">
          <TabsList className="w-full">
            <TabsTrigger value="invite" className="flex-1">הוסף</TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              חברי משפחה
              {acceptedMembers.length > 0 && (
                <Badge variant="secondary" className="ms-1.5 text-xs px-1.5">
                  {acceptedMembers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              הזינו את כתובת האימייל של בן המשפחה שברצונכם לשתף איתו גישת עריכה הדדית למתכונים
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite()
                }}
                dir="ltr"
                className="text-left"
              />
              <Button onClick={handleInvite} disabled={loading || !email.trim()}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Heart className="size-4 me-2" />
                )}
                {loading ? 'שולח...' : 'הוסף'}
              </Button>
            </div>

            {outgoingRequests.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="size-4" />
                  בקשות שנשלחו
                </h4>
                <ul className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <li key={req.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span dir="ltr">{req.addressee_email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {statusLabel(req.status)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={loading}
                        title="ביטול הבקשה"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            {acceptedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                אין חברי משפחה עדיין
              </p>
            ) : (
              <ul className="space-y-2">
                {acceptedMembers.map((member) => (
                  <li key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                      <p className="text-xs text-muted-foreground truncate" dir="ltr">{member.email}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          disabled={loading}
                          title="הסרת חבר משפחה"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>הסרת חבר משפחה</AlertDialogTitle>
                          <AlertDialogDescription>
                            פעולה זו תסיר את הגישה ההדדית לעריכת מתכונים בינך לבין {member.name || member.email}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemove(member.id)}>
                            הסר
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
