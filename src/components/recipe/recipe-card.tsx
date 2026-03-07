'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface RecipeCardProps {
  recipe: Recipe
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  isShared?: boolean
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
    case 'import':
      return '\uD83D\uDCE5'
    case 'manual':
    default:
      return '\uD83D\uDCDD'
  }
}

export function RecipeCard({ recipe, selectable, selected, onSelect, isShared }: RecipeCardProps) {
  const ingredientPreview = recipe.ingredients.slice(0, 2).join(', ')

  const cardContent = (
    <Card
      className={`h-full transition-shadow hover:shadow-md cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}
      dir="rtl"
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          {selectable && (
            <Checkbox
              checked={selected}
              className="shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <CardTitle className="text-lg line-clamp-1 flex-1">
            {recipe.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isShared && (
              <Badge variant="secondary" className="text-xs">
                משותף
              </Badge>
            )}
            <span className="text-lg" title={recipe.source_type}>
              {sourceIcon(recipe.source_type)}
            </span>
          </div>
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
  )

  if (selectable) {
    return (
      <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.() }}>
        {cardContent}
      </div>
    )
  }

  return (
    <Link href={`/recipes/${recipe.id}`} className="block">
      {cardContent}
    </Link>
  )
}
