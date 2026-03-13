import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type SelfNoteRow = Database['public']['Tables']['recipe_self_notes']['Row']

export function useSelfNotes(recipeId: string) {
  const supabase = useMemo(() => createClient(), [])
  const [note, setNote] = useState<SelfNoteRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchNote = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('recipe_self_notes')
        .select('*')
        .eq('recipe_id', recipeId)
        .maybeSingle()
      setNote(data)
    } finally {
      setLoading(false)
    }
  }, [supabase, recipeId])

  async function saveNote(content: string) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('יש להתחבר')

      const { data, error } = await supabase
        .from('recipe_self_notes')
        .upsert(
          { recipe_id: recipeId, user_id: user.id, content },
          { onConflict: 'recipe_id,user_id' }
        )
        .select()
        .single()

      if (error) throw error
      setNote(data)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote() {
    if (!note) return
    const { error } = await supabase
      .from('recipe_self_notes')
      .delete()
      .eq('id', note.id)
    if (error) throw error
    setNote(null)
  }

  return { note, loading, saving, fetchNote, saveNote, deleteNote }
}
