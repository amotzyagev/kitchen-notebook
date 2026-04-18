'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus, Share2, Bell, BookOpen, Heart } from 'lucide-react'
import Link from 'next/link'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ShareNotebookDialog } from '@/components/notebook/share-notebook-dialog'
import { PendingInvitations } from '@/components/notebook/pending-invitations'
import { SharedNotebooksList } from '@/components/notebook/shared-notebooks-list'
import { FamilyDialog } from '@/components/notebook/family-dialog'
import { useNotebookShares } from '@/hooks/use-notebook-shares'
import { useFamilyRelationships } from '@/hooks/use-family-relationships'
import { useFeatureNotifications } from '@/hooks/use-feature-notifications'

interface AppShellProps {
  user: User
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [sharedNotebooksOpen, setSharedNotebooksOpen] = useState(false)
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false)
  const { pendingCount: sharesPendingCount, fetchPending } = useNotebookShares()
  const { pendingCount: familyPendingCount } = useFamilyRelationships()
  const { unseenNotifications, unseenCount: featureUnseenCount, markAllSeen } = useFeatureNotifications()
  const pendingCount = sharesPendingCount + familyPendingCount + featureUnseenCount

  const displayName =
    user.user_metadata?.display_name || user.email || 'משתמש'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/recipes" className="text-xl font-[var(--font-display)] text-primary tracking-wide hover:opacity-80 transition-opacity">מחברת המתכונים</Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setPendingOpen(true)}
              title="הזמנות ממתינות"
            >
              <Bell className="size-4" />
              {pendingCount > 0 && (
                <Badge className="absolute -top-1 -end-1 size-5 p-0 flex items-center justify-center text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </Button>
            <div className="hidden md:flex items-center gap-2">
              <Button asChild variant="default" size="sm" className="gap-1.5">
                <Link href="/recipes/new">
                  <Plus className="size-4" />
                  מתכון חדש
                </Link>
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  {displayName}
                  <ChevronDown className="size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="size-4 me-2" />
                  שתף את המחברת
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSharedNotebooksOpen(true)}>
                  <BookOpen className="size-4 me-2" />
                  מחברות משותפות
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFamilyDialogOpen(true)}>
                  <Heart className="size-4 me-2" />
                  משפחה
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNav />

      <ShareNotebookDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
      <PendingInvitations open={pendingOpen} onOpenChange={(open) => { setPendingOpen(open); if (!open) { fetchPending(); markAllSeen() } }} unseenNotifications={unseenNotifications} />
      <SharedNotebooksList open={sharedNotebooksOpen} onOpenChange={setSharedNotebooksOpen} />
      <FamilyDialog open={familyDialogOpen} onOpenChange={setFamilyDialogOpen} />
    </div>
  )
}
