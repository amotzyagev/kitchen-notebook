'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { getRecipeCategory } from '@/lib/utils/recipe-category'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface RecipeCardProps {
  recipe: Recipe
  coverImageUrl?: string
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
  isShared?: boolean
  ownerName?: string
  index?: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function RecipeCard({ recipe, coverImageUrl, selectable, selected, onSelect, index = 0 }: RecipeCardProps) {
  const category = getRecipeCategory(recipe.tags)

  const cardContent = (
    <Card
      className={`card-animate h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-s-[3px] ${category.border} ${coverImageUrl ? 'relative' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
      dir="rtl"
    >
      {coverImageUrl && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImageUrl})` }} />
          <div className="absolute inset-0 bg-background/60 dark:bg-background/65" />
        </>
      )}
      <CardHeader className={coverImageUrl ? 'relative z-10' : ''}>
        <div className="flex items-center justify-between gap-2">
          {selectable && (
            <Checkbox
              checked={selected}
              className="shrink-0"
              aria-label="בחר מתכון"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <CardTitle className="text-lg font-bold line-clamp-2 flex-1">
            {recipe.title}
          </CardTitle>
        </div>
      </CardHeader>
      {recipe.tags.length > 0 && (
        <CardContent className={coverImageUrl ? 'relative z-10' : ''}>
          <div className="flex flex-wrap gap-1 max-h-[3.5rem] overflow-hidden">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
      <CardFooter className={`mt-auto ${coverImageUrl ? 'relative z-10' : ''}`}>
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
