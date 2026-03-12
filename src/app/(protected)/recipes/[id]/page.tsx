import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IngredientList } from '@/components/recipe/ingredient-list'
import { InstructionList } from '@/components/recipe/instruction-list'
import { DeleteRecipeButton } from '@/components/recipe/delete-recipe-button'
import { RemoveSharedRecipeButton } from '@/components/recipe/remove-shared-recipe-button'
import { ExportButton } from '@/components/recipe/export-button'
import { ShareButton } from '@/components/recipe/share-button'
import { CoverImageUpload } from '@/components/recipe/cover-image-upload'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sourceLabel(type: string): string {
  switch (type) {
    case 'link':
      return '\uD83D\uDD17 קישור'
    case 'image':
      return '\uD83D\uDCF7 תמונה'
    case 'import':
      return '\uD83D\uDCE5 ייבוא'
    case 'manual':
    default:
      return '\uD83D\uDCDD ידני'
  }
}

export default async function RecipeDetailPage({
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

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === recipe.user_id

  let coverImageUrl: string | undefined
  if (recipe.cover_image_path) {
    const { data: coverData } = await supabase.storage
      .from('recipe-images')
      .createSignedUrl(recipe.cover_image_path, 3600)
    coverImageUrl = coverData?.signedUrl
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה למתכונים
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-[var(--font-display)]">{recipe.title}</h1>
          <div className="flex gap-2 items-center">
            {!isOwner && <Badge variant="secondary">משותף</Badge>}
            <Badge variant="outline">{sourceLabel(recipe.source_type)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {coverImageUrl && (
        <div className="relative w-full h-64 rounded-lg overflow-hidden">
          <Image src={coverImageUrl} alt={recipe.title} fill className="object-cover" unoptimized />
        </div>
      )}

      <Separator />

      {/* Ingredients */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">מרכיבים</h2>
        <IngredientList ingredients={recipe.ingredients} showCheckboxes />
      </section>

      <Separator />

      {/* Instructions */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">הוראות הכנה</h2>
        <InstructionList instructions={recipe.instructions} />
      </section>

      {/* Notes */}
      {recipe.notes && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">הערות</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{recipe.notes}</p>
          </section>
        </>
      )}

      <Separator />

      {/* Metadata */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>נוצר: {formatDate(recipe.created_at)}</p>
        <p>עודכן: {formatDate(recipe.updated_at)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {isOwner && (
          <Link href={`/recipes/${recipe.id}/edit`}>
            <Button variant="outline" size="sm">עריכה</Button>
          </Link>
        )}
        {recipe.source_type !== 'manual' && (
          <Link href={`/recipes/${recipe.id}/source`}>
            <Button variant="outline" size="sm">הצג מקור</Button>
          </Link>
        )}
        {recipe.source_type === 'link' && recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">מתכון מקורי</Button>
          </a>
        )}
        <ShareButton recipeIds={[recipe.id]} />
        <ExportButton recipeIds={[recipe.id]} />
      </div>
      {isOwner && (
        <CoverImageUpload recipeId={recipe.id} hasCoverImage={!!recipe.cover_image_path} />
      )}
      <div className="flex gap-3 pt-2 border-t border-border">
        {isOwner && <DeleteRecipeButton recipeId={recipe.id} />}
        {!isOwner && <RemoveSharedRecipeButton recipeId={recipe.id} />}
      </div>
    </div>
  )
}
