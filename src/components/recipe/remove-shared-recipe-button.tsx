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
import { toast } from 'sonner'
import { UserX } from 'lucide-react'

interface RemoveSharedRecipeButtonProps {
  recipeId: string
}

export function RemoveSharedRecipeButton({ recipeId }: RemoveSharedRecipeButtonProps) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)

  async function handleRemove() {
    setIsRemoving(true)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/unshare`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'שגיאה בהסרת המתכון')
      }
      toast.success('המתכון הוסר מהרשימה שלך')
      router.push('/recipes')
    } catch (error) {
      console.error('Failed to remove shared recipe:', error)
      toast.error('שגיאה בהסרת המתכון. אנא נסה שוב.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isRemoving}>
          <UserX className="size-4 me-2" />
          הסר מהרשימה
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>להסיר את המתכון מהרשימה?</AlertDialogTitle>
          <AlertDialogDescription>
            המתכון יוסר מהרשימה שלך. המתכון המקורי לא יושפע.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemove}>
            {isRemoving ? 'מסיר...' : 'הסר'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
