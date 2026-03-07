import { createClient } from '@/lib/supabase/server'
import { RecipeList } from '@/components/recipe/recipe-list'

export default async function RecipesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('title', { ascending: true })

  if (error) {
    console.error('Failed to fetch recipes:', error)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" dir="rtl">
      <h1 className="text-2xl font-[var(--font-display)] text-primary">המתכונים שלי</h1>
      <RecipeList initialRecipes={recipes ?? []} currentUserId={user?.id} />
    </div>
  )
}
