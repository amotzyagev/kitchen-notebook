import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { IngredientList } from '@/components/recipe/ingredient-list'
import { InstructionList } from '@/components/recipe/instruction-list'
import { DeleteRecipeButton } from '@/components/recipe/delete-recipe-button'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sourceLabel(type: 'manual' | 'link' | 'image'): string {
  switch (type) {
    case 'link':
      return '\uD83D\uDD17 קישור'
    case 'image':
      return '\uD83D\uDCF7 תמונה'
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" dir="rtl">
      <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה למתכונים
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          <Badge variant="outline">{sourceLabel(recipe.source_type)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

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
      <div className="flex gap-3">
        <Link href={`/recipes/${recipe.id}/edit`}>
          <Button variant="outline" size="sm">עריכה</Button>
        </Link>
        {recipe.source_type !== 'manual' && (
          <Link href={`/recipes/${recipe.id}/source`}>
            <Button variant="outline" size="sm">הצג מקור</Button>
          </Link>
        )}
        {recipe.source_type === 'link' && recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">מקור מקורי</Button>
          </a>
        )}
        <DeleteRecipeButton recipeId={recipe.id} />
      </div>
    </div>
  )
}
