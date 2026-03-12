import { useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { RECIPE_IMAGES_BUCKET } from '@/lib/constants/image'

type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeRow = Database['public']['Tables']['recipes']['Row']

export function useRecipes() {
  const supabase = useMemo(() => createClient(), [])
  const creating = useRef(false)

  async function createRecipe(data: Omit<RecipeInsert, 'user_id'>): Promise<RecipeRow> {
    if (creating.current) {
      throw new Error('שמירה כבר מתבצעת')
    }
    creating.current = true
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('[createRecipe] user:', user?.id, 'authError:', authError?.message)
      if (!user) throw new Error('יש להתחבר כדי לשמור מתכון')

      const insertData = { ...data, user_id: user.id }
      console.log('[createRecipe] inserting with user_id:', user.id, 'source_type:', insertData.source_type)

      const insertPromise = supabase
        .from('recipes')
        .insert(insertData)
        .select()
        .single()

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('שמירת המתכון נכשלה - זמן המתנה עבר. נסה שוב.')), 15000)
      )

      const { data: recipe, error } = await Promise.race([insertPromise, timeoutPromise])

      console.log('[createRecipe] result:', recipe?.id, 'error:', error ? JSON.stringify(error) : 'none')
      if (error) {
        throw error
      }
      return recipe
    } finally {
      creating.current = false
    }
  }

  async function uploadRecipeImage(
    userId: string,
    recipeId: string,
    file: File
  ): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${userId}/${recipeId}/image.${ext}`
    const { error } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .upload(path, file, { upsert: true })
    if (error) throw error
    return path
  }

  async function updateRecipe(id: string, data: Partial<RecipeInsert>): Promise<RecipeRow> {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return recipe
  }

  async function deleteRecipe(id: string): Promise<void> {
    // First get recipe to check for images
    const { data: recipe } = await supabase
      .from('recipes')
      .select('source_image_path')
      .eq('id', id)
      .single()

    // Delete image from storage if exists
    if (recipe?.source_image_path) {
      await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .remove([recipe.source_image_path])
    }

    // Delete recipe
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  return { createRecipe, uploadRecipeImage, updateRecipe, deleteRecipe }
}
