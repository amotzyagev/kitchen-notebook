'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RecipeForm } from '@/components/recipe/recipe-form'
import { useRecipes } from '@/hooks/use-recipes'
import { createClient } from '@/lib/supabase/client'
import type { RecipeForm as RecipeFormType } from '@/lib/validators/recipe'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { updateRecipe } = useRecipes()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchRecipe() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setRecipe(data)
      }
      setIsFetching(false)
    }
    fetchRecipe()
  }, [params.id])

  async function handleSubmit(data: RecipeFormType) {
    setIsLoading(true)
    try {
      await updateRecipe(params.id, {
        title: data.title,
        ingredients: data.ingredients,
        instructions: data.instructions,
        notes: data.notes || null,
        tags: data.tags,
      })
      router.push(`/recipes/${params.id}`)
    } catch (error) {
      console.error('Failed to update recipe:', error)
      toast.error('שגיאה בעדכון המתכון. אנא נסה שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <p className="text-muted-foreground">המתכון לא נמצא</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <h1 className="text-2xl font-[var(--font-display)] text-primary">עריכת מתכון</h1>
      {recipe && (
        <RecipeForm
          key={recipe.id}
          onSubmit={handleSubmit}
          defaultValues={{
            title: recipe.title,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            notes: recipe.notes ?? '',
            tags: recipe.tags,
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
