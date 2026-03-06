'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface RecipeCardProps {
  recipe: Recipe
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function sourceIcon(type: Recipe['source_type']): string {
  switch (type) {
    case 'link':
      return '\uD83D\uDD17'
    case 'image':
      return '\uD83D\uDCF7'
    case 'manual':
    default:
      return '\uD83D\uDCDD'
  }
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const ingredientPreview = recipe.ingredients.slice(0, 2).join(', ')

  return (
    <Link href={`/recipes/${recipe.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer" dir="rtl">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg line-clamp-1">
              {recipe.title}
            </CardTitle>
            <span className="text-lg shrink-0" title={recipe.source_type}>
              {sourceIcon(recipe.source_type)}
            </span>
          </div>
          {ingredientPreview && (
            <CardDescription className="line-clamp-1">
              {ingredientPreview}
            </CardDescription>
          )}
        </CardHeader>
        {recipe.tags.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
        <CardFooter>
          <span className="text-xs text-muted-foreground">
            {formatDate(recipe.updated_at)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
