import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeRow = Database['public']['Tables']['recipes']['Row']

export function useRecipes() {
  const supabase = createClient()

  async function createRecipe(data: Omit<RecipeInsert, 'user_id'>): Promise<RecipeRow> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[createRecipe] user:', user?.id, 'authError:', authError?.message)
    if (!user) throw new Error('יש להתחבר כדי לשמור מתכון')

    const insertData = { ...data, user_id: user.id }
    console.log('[createRecipe] inserting with user_id:', user.id)
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert(insertData)
      .select()
      .single()
    if (error) {
      console.error('[createRecipe] insert error:', JSON.stringify(error))
      throw error
    }
    return recipe
  }

  async function uploadRecipeImage(
    userId: string,
    recipeId: string,
    file: File
  ): Promise<string> {
    const path = `${userId}/${recipeId}/${file.name}`
    const { error } = await supabase.storage
      .from('recipe-images')
      .upload(path, file)
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
        .from('recipe-images')
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
