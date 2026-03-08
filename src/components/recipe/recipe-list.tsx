'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { CheckSquare, Share2, Printer, X, ChevronDown, ChevronUp, Link2, Camera, FileText, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RecipeCard } from './recipe-card'
import { ShareDialog } from './share-dialog'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Recipe = Database['public']['Tables']['recipes']['Row']

interface RecipeListProps {
  initialRecipes: Recipe[]
  currentUserId?: string
}

export function RecipeList({ initialRecipes, currentUserId }: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [showSharedOnly, setShowSharedOnly] = useState(false)
  const [tagsExpanded, setTagsExpanded] = useState(false)

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
          .order('title', { ascending: true })

        if (searchQuery.trim()) {
          query = query.ilike('title', `%${searchQuery.trim()}%`)
        }

        if (selectedTag) {
          query = query.contains('tags', [selectedTag])
        }

        if (showSharedOnly && currentUserId) {
          query = query.neq('user_id', currentUserId)
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
  }, [searchQuery, selectedTag, showSharedOnly, currentUserId, supabase])

  function handleTagClick(tag: string) {
    setSelectedTag((prev) => (prev === tag ? null : tag))
  }

  if (initialRecipes.length === 0 && !searchQuery && !selectedTag) {
    return (
      <div className="text-center py-12 space-y-6" dir="rtl">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">ברוכים הבאים למחברת המתכונים!</h2>
          <p className="text-muted-foreground">
            הוסיפו את המתכון הראשון שלכם באחת הדרכים:
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
          <Link href="/recipes/new?tab=link" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
            <Link2 className="size-6 text-primary" />
            <span>הדבקת קישור</span>
          </Link>
          <Link href="/recipes/new?tab=photo" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
            <Camera className="size-6 text-primary" />
            <span>צילום מתכון</span>
          </Link>
          <Link href="/recipes/new?tab=text" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
            <FileText className="size-6 text-primary" />
            <span>טקסט חופשי</span>
          </Link>
          <Link href="/recipes/new?tab=file" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-accent transition-colors">
            <Upload className="size-6 text-primary" />
            <span>ייבוא קובץ</span>
          </Link>
        </div>
      </div>
    )
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  function handleExportSelected() {
    const ids = Array.from(selectedIds)
    window.open(`/recipes/print?ids=${ids.join(',')}`, '_blank')
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search + Actions bar */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="חיפוש מתכונים..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          variant={selectionMode ? 'default' : 'outline'}
          size="icon"
          onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
          title={selectionMode ? 'ביטול בחירה' : 'בחירת מתכונים'}
          aria-label={selectionMode ? 'ביטול בחירה' : 'בחירת מתכונים'}
        >
          <CheckSquare className="size-4" />
        </Button>
      </div>

      {/* Tag filters + shared filter */}
      <div className={cn('flex flex-wrap gap-2', !tagsExpanded && 'max-h-[4.5rem] overflow-hidden')}>
        {currentUserId && (
          <Badge
            variant={showSharedOnly ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setShowSharedOnly((prev) => !prev)}
          >
            שותפו איתי
          </Badge>
        )}
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
      {allTags.length > 6 && (
        <button
          onClick={() => setTagsExpanded(!tagsExpanded)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {tagsExpanded ? (
            <><ChevronUp className="size-3" /> פחות</>
          ) : (
            <><ChevronDown className="size-3" /> עוד תגיות...</>
          )}
        </button>
      )}

      {/* Results */}
      {isSearching ? (
        <p className="text-center text-muted-foreground py-8">מחפש...</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">
            {showSharedOnly ? 'אין מתכונים ששותפו איתך' : 'אין מתכונים עדיין — הוסף את הראשון!'}
          </p>
          {!showSharedOnly && (
            <Link href="/recipes/new">
              <Button>הוסף מתכון</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe, i) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              index={i}
              selectable={selectionMode}
              selected={selectedIds.has(recipe.id)}
              onSelect={() => toggleSelection(recipe.id)}
              isShared={!!currentUserId && recipe.user_id !== currentUserId}
            />
          ))}
        </div>
      )}

      {/* Floating action bar for selection mode */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-background border rounded-lg shadow-lg p-3">
          <Button
            size="sm"
            onClick={() => setShareDialogOpen(true)}
          >
            <Share2 className="size-4 me-2" />
            שתף ({selectedIds.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSelected}
          >
            <Printer className="size-4 me-2" />
            ייצוא ({selectedIds.size})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitSelectionMode}
          >
            <X className="size-4 me-2" />
            ביטול
          </Button>
        </div>
      )}

      {/* Share dialog for multi-select */}
      <ShareDialog
        recipeIds={Array.from(selectedIds)}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  )
}
