'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RecipeCard } from './recipe-card'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface RecipeListProps {
  initialRecipes: Recipe[]
}

export function RecipeList({ initialRecipes }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Collect all distinct tags from initial recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    initialRecipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [initialRecipes])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        let query = supabase
          .from('recipes')
          .select('*')
          .order('updated_at', { ascending: false })

        if (searchQuery.trim()) {
          query = query.ilike('title', `%${searchQuery.trim()}%`)
        }

        if (selectedTag) {
          query = query.contains('tags', [selectedTag])
        }

        const { data, error } = await query
        if (error) throw error
        setRecipes(data ?? [])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedTag, supabase])

  function handleTagClick(tag: string) {
    setSelectedTag((prev) => (prev === tag ? null : tag))
  }

  if (initialRecipes.length === 0 && !searchQuery && !selectedTag) {
    return (
      <div className="text-center py-12 space-y-4" dir="rtl">
        <p className="text-muted-foreground text-lg">
          אין מתכונים עדיין — הוסף את הראשון!
        </p>
        <Link href="/recipes/new">
          <Button>הוסף מתכון</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search */}
      <Input
        placeholder="חיפוש מתכונים..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Results */}
      {isSearching ? (
        <p className="text-center text-muted-foreground py-8">מחפש...</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">
            אין מתכונים עדיין — הוסף את הראשון!
          </p>
          <Link href="/recipes/new">
            <Button>הוסף מתכון</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
