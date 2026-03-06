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

  return (
    <ul className="space-y-2" dir="rtl">
      {ingredients.map((ingredient, index) => (
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
      ))}
    </ul>
  )
}
