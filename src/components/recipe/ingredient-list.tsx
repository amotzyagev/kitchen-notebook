'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

interface IngredientListProps {
  ingredients: string[]
  showCheckboxes?: boolean
}

export function IngredientList({ ingredients, showCheckboxes = false }: IngredientListProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggleItem(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function isGroupHeader(text: string): boolean {
    const trimmed = text.trim()
    return trimmed.endsWith(':') && !trimmed.includes(' - ') && trimmed.length < 50
  }

  return (
    <ul className="space-y-2" dir="rtl">
      {ingredients.map((ingredient, index) => {
        if (isGroupHeader(ingredient)) {
          return (
            <li key={index} className={index > 0 ? 'pt-2' : ''}>
              <span className="font-semibold text-sm">{ingredient}</span>
            </li>
          )
        }
        return (
          <li key={index} className="flex items-center gap-2">
            {showCheckboxes && (
              <Checkbox
                checked={checked.has(index)}
                onCheckedChange={() => toggleItem(index)}
              />
            )}
            <span className={checked.has(index) ? 'line-through text-muted-foreground' : ''}>
              {ingredient}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
