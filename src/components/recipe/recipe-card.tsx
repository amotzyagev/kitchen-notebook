'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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

export function RecipeCard({ recipe, coverImageUrl, selectable, selected, onSelect, isShared, ownerName, index = 0 }: RecipeCardProps) {
  const ingredientPreview = recipe.ingredients.slice(0, 2).join(', ')

  const cardContent = (
    <Card
      className={`card-animate h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${coverImageUrl ? 'relative' : ''} ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
      dir="rtl"
    >
      {coverImageUrl && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImageUrl})` }} />
          <div className="absolute inset-0 bg-background/80 dark:bg-background/85" />
        </>
      )}
      <div
        className={`h-1.5 rounded-t-[inherit] ${coverImageUrl ? 'relative z-10' : ''}`}
        style={{
          backgroundColor:
            recipe.source_type === 'link' ? 'var(--chart-2)'
            : recipe.source_type === 'image' ? 'var(--chart-4)'
            : recipe.source_type === 'import' ? 'var(--chart-3)'
            : 'var(--chart-1)'
        }}
      />
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
          <CardTitle className="text-lg line-clamp-1 flex-1">
            {recipe.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isShared && ownerName && (
              <Badge variant="secondary" className="text-xs">
                {ownerName}
              </Badge>
            )}
            {isShared && !ownerName && (
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
        <CardContent className={coverImageUrl ? 'relative z-10' : ''}>
          <div className="flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
      <CardFooter className={coverImageUrl ? 'relative z-10' : ''}>
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
