'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { useRecipes } from '@/hooks/use-recipes'
import { Trash2 } from 'lucide-react'

interface DeleteRecipeButtonProps {
  recipeId: string
}

export function DeleteRecipeButton({ recipeId }: DeleteRecipeButtonProps) {
  const router = useRouter()
  const { deleteRecipe } = useRecipes()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteRecipe(recipeId)
      router.push('/recipes')
    } catch (error) {
      console.error('Failed to delete recipe:', error)
      alert('שגיאה במחיקת המתכון. אנא נסה שוב.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isDeleting}>
          <Trash2 className="size-4 me-2" />
          מחק
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>האם למחוק את המתכון?</AlertDialogTitle>
          <AlertDialogDescription>
            פעולה זו לא ניתנת לביטול
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'מוחק...' : 'מחק'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
