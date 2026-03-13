'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, StickyNote, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useSelfNotes } from '@/hooks/use-self-notes'
import { useRecipes } from '@/hooks/use-recipes'
import type { Database } from '@/types/database'

type RecipeRow = Database['public']['Tables']['recipes']['Row']

interface SelfNotesSectionProps {
  recipeId: string
  isOwner: boolean
  recipe: RecipeRow
}

function SelfNotesEditor({ recipeId }: { recipeId: string }) {
  const { note, loading, saving, fetchNote, saveNote } = useSelfNotes(recipeId)
  const [content, setContent] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    fetchNote().then(() => setFetched(true))
  }, [fetchNote])

  // Initialize content from note once after fetch completes
  const displayContent = content ?? note?.content ?? ''

  if (loading || !fetched) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="size-4 animate-spin" />
        <span>טוען הערות...</span>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">הערות שלי</h2>
      <Textarea
        value={displayContent}
        onChange={(e) => setContent(e.target.value)}
        placeholder="הוסף הערות אישיות..."
        rows={4}
        dir="rtl"
      />
      <Button
        size="sm"
        onClick={async () => {
          try {
            await saveNote(displayContent)
            toast.success('ההערות נשמרו')
          } catch {
            toast.error('שגיאה בשמירת ההערות')
          }
        }}
        disabled={saving}
      >
        {saving ? <Loader2 className="size-4 animate-spin me-2" /> : null}
        {saving ? 'שומר...' : 'שמור'}
      </Button>
    </section>
  )
}

export function SelfNotesSection({ recipeId, isOwner, recipe }: SelfNotesSectionProps) {
  const { note, loading, fetchNote } = useSelfNotes(recipeId)
  const { createRecipe } = useRecipes()
  const router = useRouter()
  const [showNotes, setShowNotes] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    fetchNote()
  }, [fetchNote])

  // For owned recipes or if user already has notes, show editor directly
  if (isOwner || note) {
    return (
      <>
        <Separator />
        <SelfNotesEditor recipeId={recipeId} />
      </>
    )
  }

  // If still loading, wait
  if (loading) return null

  // User chose to add notes via dialog
  if (showNotes) {
    return (
      <>
        <Separator />
        <SelfNotesEditor recipeId={recipeId} />
      </>
    )
  }

  // Shared recipe, no notes yet — show choice dialog
  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const newRecipe = await createRecipe({
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        notes: recipe.notes,
        tags: recipe.tags,
        source_type: 'import',
      })
      setDialogOpen(false)
      toast.success('המתכון הועתק למחברת שלך')
      router.push(`/recipes/${newRecipe.id}/edit`)
    } catch {
      toast.error('שגיאה בהעתקת המתכון')
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <StickyNote className="size-4 me-2" />
          הוסף הערות אישיות
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>הערות אישיות</DialogTitle>
          <DialogDescription>
            איך תרצה לשמור את ההערות שלך?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <button
            className="w-full rounded-lg border p-4 text-right hover:bg-accent transition-colors"
            onClick={() => {
              setDialogOpen(false)
              setShowNotes(true)
            }}
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              <StickyNote className="size-4" />
              הוסף הערות
            </div>
            <p className="text-sm text-muted-foreground">
              ההערות יישמרו באופן פרטי על המתכון המשותף. רק אתה תראה אותן. אם בעל המתכון ימחק אותו, גם ההערות שלך יימחקו.
            </p>
          </button>
          <button
            className="w-full rounded-lg border p-4 text-right hover:bg-accent transition-colors"
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              {duplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
              שמור עותק במחברת שלי
            </div>
            <p className="text-sm text-muted-foreground">
              המתכון יועתק למחברת שלך כמתכון חדש ועצמאי. תוכל לערוך אותו בחופשיות, והוא לא יושפע אם המתכון המקורי יימחק.
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
