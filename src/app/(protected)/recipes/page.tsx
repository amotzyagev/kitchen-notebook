import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RecipeList } from '@/components/recipe/recipe-list'

export default async function RecipesPage() {
  const supabase = await createClient()

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch recipes:', error)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">המתכונים שלי</h1>
        <Link
          href="/import"
          className="text-sm text-primary hover:underline"
        >
          ייבוא מקבצים
        </Link>
      </div>
      <RecipeList initialRecipes={recipes ?? []} />
    </div>
  )
}
