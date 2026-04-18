'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IngredientList } from '@/components/recipe/ingredient-list'
import { scaleIngredient } from '@/lib/utils/scale-ingredient'

const PRESETS = [
  { label: '¼', value: 0.25 },
  { label: '⅓', value: 1 / 3 },
  { label: '½', value: 0.5 },
  { label: '1', value: 1 },
  { label: '1½', value: 1.5 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
]

interface RecipeMultiplierSectionProps {
  ingredients: string[]
}

export function RecipeMultiplierSection({ ingredients }: RecipeMultiplierSectionProps) {
  const [multiplier, setMultiplier] = useState(1)
  const [customInput, setCustomInput] = useState('')

  function applyCustomInput(raw: string) {
    const trimmed = raw.trim()
    // Support fraction input like "1/3"
    const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
    if (fractionMatch) {
      const val = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2])
      if (val > 0) setMultiplier(val)
      return
    }
    const val = parseFloat(trimmed)
    if (!isNaN(val) && val > 0) setMultiplier(val)
  }

  const scaledIngredients = ingredients.map((i) => scaleIngredient(i, multiplier))

  const activePreset = PRESETS.find((p) => Math.abs(p.value - multiplier) < 0.01)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">מרכיבים</h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-muted-foreground">×</span>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={activePreset?.value === preset.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs min-w-[28px]"
              onClick={() => {
                setMultiplier(preset.value)
                setCustomInput('')
              }}
            >
              {preset.label}
            </Button>
          ))}
          <Input
            type="text"
            inputMode="decimal"
            placeholder="…"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onBlur={() => applyCustomInput(customInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCustomInput(customInput)
            }}
            className="h-7 w-14 text-xs text-center px-1"
          />
        </div>
      </div>
      <IngredientList ingredients={scaledIngredients} showCheckboxes />
    </section>
  )
}
