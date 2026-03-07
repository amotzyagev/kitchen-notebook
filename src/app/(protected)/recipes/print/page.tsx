import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintView } from '@/components/recipe/print-view'

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids } = await searchParams
  if (!ids) redirect('/recipes')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const recipeIds = ids.split(',').filter(Boolean)
  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .in('id', recipeIds)

  if (!recipes?.length) redirect('/recipes')

  return <PrintView recipes={recipes} />
}
