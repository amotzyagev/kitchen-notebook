import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recipeFormSchema, recipeInsertSchema } from '@/lib/validators/recipe'

// Mock Supabase client
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockUpdateEq = vi.fn(() => ({ select: mockSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockSelectEq = vi.fn(() => ({ single: mockSingle }))
const mockFrom = vi.fn((table: string) => {
  void table
  return {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: vi.fn(() => ({ eq: mockSelectEq })),
  }
})
const mockRemove = vi.fn()
const mockUpload = vi.fn()
const mockStorage = {
  from: vi.fn(() => ({ upload: mockUpload, remove: mockRemove })),
}
const mockSupabase = {
  from: mockFrom,
  storage: mockStorage,
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Import after mocking
import { useRecipes } from '@/hooks/use-recipes'

describe('Recipe CRUD operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRecipe', () => {
    it('inserts a recipe and returns it', async () => {
      const newRecipe = {
        title: 'Test Recipe',
        ingredients: ['flour', 'sugar'],
        instructions: ['mix', 'bake'],
        source_type: 'manual' as const,
      }
      const returnedRecipe = { id: '123', ...newRecipe }
      mockSingle.mockResolvedValue({ data: returnedRecipe, error: null })

      const { createRecipe } = useRecipes()
      const result = await createRecipe(newRecipe)

      expect(mockFrom).toHaveBeenCalledWith('recipes')
      expect(mockInsert).toHaveBeenCalledWith(newRecipe)
      expect(result).toEqual(returnedRecipe)
    })

    it('throws on Supabase error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

      const { createRecipe } = useRecipes()
      await expect(
        createRecipe({ title: 'Test', source_type: 'manual' })
      ).rejects.toEqual({ message: 'Insert failed' })
    })
  })

  describe('updateRecipe', () => {
    it('updates a recipe and returns it', async () => {
      const updated = { id: '123', title: 'Updated' }
      mockSingle.mockResolvedValue({ data: updated, error: null })

      const { updateRecipe } = useRecipes()
      const result = await updateRecipe('123', { title: 'Updated' })

      expect(mockFrom).toHaveBeenCalledWith('recipes')
      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated' })
      expect(result).toEqual(updated)
    })

    it('throws on Supabase error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      const { updateRecipe } = useRecipes()
      await expect(
        updateRecipe('123', { title: 'Updated' })
      ).rejects.toEqual({ message: 'Update failed' })
    })
  })

  describe('deleteRecipe', () => {
    it('deletes a recipe without image', async () => {
      mockSingle.mockResolvedValue({ data: { source_image_path: null }, error: null })
      mockDeleteEq.mockResolvedValue({ error: null })

      const { deleteRecipe } = useRecipes()
      await deleteRecipe('123')

      expect(mockFrom).toHaveBeenCalledWith('recipes')
      expect(mockStorage.from).not.toHaveBeenCalled()
    })

    it('deletes image from storage when recipe has one', async () => {
      mockSingle.mockResolvedValue({ data: { source_image_path: 'path/to/img.jpg' }, error: null })
      mockDeleteEq.mockResolvedValue({ error: null })

      const { deleteRecipe } = useRecipes()
      await deleteRecipe('123')

      expect(mockStorage.from).toHaveBeenCalledWith('recipe-images')
      expect(mockRemove).toHaveBeenCalledWith(['path/to/img.jpg'])
    })

    it('throws on delete error', async () => {
      mockSingle.mockResolvedValue({ data: { source_image_path: null }, error: null })
      mockDeleteEq.mockResolvedValue({ error: { message: 'Delete failed' } })

      const { deleteRecipe } = useRecipes()
      await expect(deleteRecipe('123')).rejects.toEqual({ message: 'Delete failed' })
    })
  })

  describe('uploadRecipeImage', () => {
    it('uploads and returns the path', async () => {
      mockUpload.mockResolvedValue({ error: null })
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      const { uploadRecipeImage } = useRecipes()
      const path = await uploadRecipeImage('user-1', 'recipe-1', file)

      expect(path).toBe('user-1/recipe-1/photo.jpg')
      expect(mockStorage.from).toHaveBeenCalledWith('recipe-images')
    })

    it('throws on upload error', async () => {
      mockUpload.mockResolvedValue({ error: { message: 'Upload failed' } })
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      const { uploadRecipeImage } = useRecipes()
      await expect(
        uploadRecipeImage('user-1', 'recipe-1', file)
      ).rejects.toEqual({ message: 'Upload failed' })
    })
  })
})

describe('Zod validation catches bad input', () => {
  it('rejects recipe form with no title', () => {
    const result = recipeFormSchema.safeParse({
      title: '',
      ingredients: ['a'],
      instructions: ['b'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects recipe insert with invalid source_type', () => {
    const result = recipeInsertSchema.safeParse({
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects recipe insert with invalid URL', () => {
    const result = recipeInsertSchema.safeParse({
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'link',
      source_url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })
})
