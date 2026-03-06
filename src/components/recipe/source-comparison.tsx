'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IngredientList } from '@/components/recipe/ingredient-list'
import { InstructionList } from '@/components/recipe/instruction-list'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface SourceComparisonProps {
  recipe: Recipe
  imageUrl?: string
}

function OriginalSource({ recipe, imageUrl }: SourceComparisonProps) {
  if (recipe.source_type === 'manual') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">מתכון ידני — אין מקור חיצוני</p>
        </CardContent>
      </Card>
    )
  }

  if (recipe.source_type === 'image' && imageUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>תמונת מקור</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-auto">
            <Image
              src={imageUrl}
              alt="תמונת מקור המתכון"
              width={800}
              height={600}
              className="rounded-md object-contain w-full h-auto"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recipe.source_type === 'link') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>טקסט מקורי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recipe.original_text && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {recipe.original_text}
            </p>
          )}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                פתח מקור מקורי
              </Button>
            </a>
          )}
        </CardContent>
      </Card>
    )
  }

  return null
}

export function SourceComparison({ recipe, imageUrl }: SourceComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
      {/* Hebrew translated recipe - always first */}
      <Card>
        <CardHeader>
          <CardTitle>{recipe.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="font-semibold">מרכיבים</h3>
            <IngredientList ingredients={recipe.ingredients} />
          </section>
          <section className="space-y-2">
            <h3 className="font-semibold">הוראות הכנה</h3>
            <InstructionList instructions={recipe.instructions} />
          </section>
        </CardContent>
      </Card>

      {/* Original source */}
      <OriginalSource recipe={recipe} imageUrl={imageUrl} />
    </div>
  )
}
