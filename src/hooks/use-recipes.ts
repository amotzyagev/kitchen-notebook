import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { RECIPE_IMAGES_BUCKET } from '@/lib/constants/image'

type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
type RecipeRow = Database['public']['Tables']['recipes']['Row']

let creating = false
const pendingImageCleanup = new Map<string, string[]>()

export function useRecipes() {
  const supabase = createClient()

  async function createRecipe(data: Omit<RecipeInsert, 'user_id'>): Promise<RecipeRow> {
    if (creating) {
      throw new Error('שמירה כבר מתבצעת')
    }
    creating = true
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('[createRecipe] user:', user?.id, 'authError:', authError?.message)
      if (!user) throw new Error('יש להתחבר כדי לשמור מתכון')

      const insertData = { ...data, user_id: user.id }
      console.log('[createRecipe] inserting with user_id:', user.id, 'source_type:', insertData.source_type)

      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert(insertData)
        .select()
        .single()

      console.log('[createRecipe] result:', recipe?.id, 'error:', error ? JSON.stringify(error) : 'none')
      if (error) {
        // A previous attempt may have committed even if its response was lost.
        // Only recover explicit IDs owned by this user; never overwrite a row.
        if (error.code === '23505' && data.id) {
          const { data: existing, error: readError } = await supabase
            .from('recipes').select('*').eq('id', data.id).single()
          if (!readError && existing?.user_id === user.id) return existing
        }
        throw error
      }
      return recipe
    } finally {
      creating = false
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
    let paths = pendingImageCleanup.get(id)
    if (!paths) {
      const { data: recipe, error: readError } = await supabase
        .from('recipes')
        .select('source_image_path, cover_image_path')
        .eq('id', id)
        .single()
      if (readError) throw readError

      const { data: deleted, error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!deleted?.length) throw new Error('המתכון לא נמחק. בדקו שיש לכם הרשאה למחוק אותו.')

      // Keep images intact if deleting the recipe fails. Remember paths so
      // the delete button can retry cleanup even after the row is gone.
      paths = [...new Set([recipe?.source_image_path, recipe?.cover_image_path]
        .filter((path): path is string => !!path))]
      pendingImageCleanup.set(id, paths)
    }
    if (paths.length) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: cleanupError } = await supabase.storage
          .from(RECIPE_IMAGES_BUCKET).remove(paths)
        if (!cleanupError) {
          pendingImageCleanup.delete(id)
          return
        }
        if (attempt === 2) throw new Error('המתכון נמחק, אך ניקוי התמונות נכשל. נסה שוב.')
      }
    }
    pendingImageCleanup.delete(id)
  }

  return { createRecipe, uploadRecipeImage, updateRecipe, deleteRecipe }
}
