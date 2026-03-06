import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SourceComparison } from '@/components/recipe/source-comparison'

export default async function SourcePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !recipe) {
    notFound()
  }

  if (recipe.source_type === 'manual') {
    redirect(`/recipes/${id}`)
  }

  let imageUrl: string | undefined

  if (recipe.source_type === 'image' && recipe.source_image_path) {
    const { data } = await supabase.storage
      .from('recipe-images')
      .createSignedUrl(recipe.source_image_path, 3600)

    if (data?.signedUrl) {
      imageUrl = data.signedUrl
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">השוואת מקור</h1>
        <div className="flex gap-3">
          <Link href={`/recipes/${recipe.id}`}>
            <Button variant="outline" size="sm">חזור למתכון</Button>
          </Link>
          <Link href={`/recipes/${recipe.id}/edit`}>
            <Button variant="outline" size="sm">עריכה</Button>
          </Link>
        </div>
      </div>

      <SourceComparison recipe={recipe} imageUrl={imageUrl} />
    </div>
  )
}
