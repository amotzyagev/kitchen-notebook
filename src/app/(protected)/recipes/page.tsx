import { createClient } from '@/lib/supabase/server'
import { resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { RecipeList } from '@/components/recipe/recipe-list'

export type OwnerMap = Record<string, { name: string; email: string }>

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

  // Build owner map from approved notebook shares
  const ownerMap: OwnerMap = {}
  if (user) {
    const { data: notebookShares } = await supabase
      .from('notebook_shares')
      .select('owner_id')
      .eq('shared_with_user_id', user.id)
      .eq('status', 'approved')

    if (notebookShares) {
      const uniqueOwnerIds = [...new Set(notebookShares.map(s => s.owner_id))]
      await Promise.all(
        uniqueOwnerIds.map(async (ownerId) => {
          ownerMap[ownerId] = await resolveUserDisplayInfo(ownerId)
        })
      )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6" dir="rtl">
      <h1 className="text-2xl font-[var(--font-display)] text-primary">המתכונים שלי</h1>
      <RecipeList initialRecipes={recipes ?? []} currentUserId={user?.id} ownerMap={ownerMap} />
    </div>
  )
}
