'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { recipeFormSchema, type RecipeForm as RecipeFormType } from '@/lib/validators/recipe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Resolver } from 'react-hook-form'

interface RecipeFormProps {
  onSubmit: (
    data: RecipeFormType,
    meta?: {
      sourceType?: 'manual' | 'link' | 'image'
      sourceUrl?: string
      sourceImagePath?: string
      originalText?: string
    }
  ) => Promise<void>
  defaultValues?: Partial<RecipeFormType>
  isLoading?: boolean
  sourceType?: 'manual' | 'link' | 'image'
  sourceUrl?: string
  sourceImagePath?: string
  originalText?: string
}

export function RecipeForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  sourceType,
  sourceUrl,
  sourceImagePath,
  originalText,
}: RecipeFormProps) {
  const [tagInput, setTagInput] = useState('')

  const form = useForm<RecipeFormType>({
    resolver: zodResolver(recipeFormSchema) as Resolver<RecipeFormType>,
    defaultValues: {
      title: defaultValues?.title ?? '',
      ingredients: defaultValues?.ingredients?.length ? defaultValues.ingredients : [''],
      instructions: defaultValues?.instructions?.length ? defaultValues.instructions : [''],
      notes: defaultValues?.notes ?? '',
      tags: defaultValues?.tags ?? [],
    },
  })

  const ingredients = useWatch({ control: form.control, name: 'ingredients' })
  const instructions = useWatch({ control: form.control, name: 'instructions' })
  const tags = useWatch({ control: form.control, name: 'tags' })

  function addIngredient() {
    form.setValue('ingredients', [...ingredients, ''])
  }

  function removeIngredient(index: number) {
    if (ingredients.length <= 1) return
    form.setValue(
      'ingredients',
      ingredients.filter((_, i) => i !== index)
    )
  }

  function addInstruction() {
    form.setValue('instructions', [...instructions, ''])
  }

  function removeInstruction(index: number) {
    if (instructions.length <= 1) return
    form.setValue(
      'instructions',
      instructions.filter((_, i) => i !== index)
    )
  }

  function handleAddTag() {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    const newTags = trimmed.split(',').map((t) => t.trim()).filter(Boolean)
    const currentTags = form.getValues('tags')
    const uniqueNew = newTags.filter((t) => !currentTags.includes(t))
    if (uniqueNew.length > 0) {
      form.setValue('tags', [...currentTags, ...uniqueNew])
    }
    setTagInput('')
  }

  function handleRemoveTag(index: number) {
    const currentTags = form.getValues('tags')
    form.setValue(
      'tags',
      currentTags.filter((_, i) => i !== index)
    )
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  async function handleSubmit(data: RecipeFormType) {
    await onSubmit(data, {
      sourceType,
      sourceUrl,
      sourceImagePath,
      originalText,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        dir="rtl"
      >
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>כותרת</FormLabel>
              <FormControl>
                <Input placeholder="שם המתכון" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ingredients */}
        <div className="space-y-3">
          <FormLabel>מרכיבים</FormLabel>
          {ingredients.map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`מרכיב ${index + 1}`}
                value={ingredients[index]}
                onChange={(e) => {
                  const updated = [...ingredients]
                  updated[index] = e.target.value
                  form.setValue('ingredients', updated, { shouldValidate: false })
                }}
              />
              {ingredients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="הסר מרכיב"
                  onClick={() => removeIngredient(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIngredient}
          >
            <Plus className="size-4" />
            הוסף מרכיב
          </Button>
          {form.formState.errors.ingredients?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.ingredients.message}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <FormLabel>הוראות הכנה</FormLabel>
          {instructions.map((_, index) => (
            <div key={index} className="flex gap-2">
              <span className="flex items-center justify-center size-8 rounded-full bg-muted text-sm font-medium shrink-0">
                {index + 1}
              </span>
              <Textarea
                placeholder={`שלב ${index + 1}`}
                rows={2}
                value={instructions[index]}
                onChange={(e) => {
                  const updated = [...instructions]
                  updated[index] = e.target.value
                  form.setValue('instructions', updated, { shouldValidate: false })
                }}
              />
              {instructions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="הסר שלב"
                  onClick={() => removeInstruction(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInstruction}
          >
            <Plus className="size-4" />
            הוסף שלב
          </Button>
          {form.formState.errors.instructions?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.instructions.message}
            </p>
          )}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>הערות</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="הערות, טיפים, הצעות הגשה..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <div className="space-y-3">
          <FormLabel>תגיות</FormLabel>
          <div className="flex gap-2">
            <Input
              placeholder="הוסף תגיות (מופרדות בפסיק)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
              הוסף
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => handleRemoveTag(index)}
                >
                  {tag}
                  <span className="text-xs">&times;</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'שומר...' : 'שמור מתכון'}
        </Button>
      </form>
    </Form>
  )
}
