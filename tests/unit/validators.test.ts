import { describe, it, expect } from 'vitest'
import { recipeFormSchema, recipeInsertSchema, recipeSchema, sourceTypeSchema } from '@/lib/validators/recipe'
import { aiRecipeExtractionSchema } from '@/lib/validators/ai-response'
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validators/auth'
import { parseUrlRequestSchema, parseImageRequestSchema } from '@/lib/validators/api'

describe('sourceTypeSchema', () => {
  it('accepts valid source types', () => {
    expect(sourceTypeSchema.safeParse('manual').success).toBe(true)
    expect(sourceTypeSchema.safeParse('link').success).toBe(true)
    expect(sourceTypeSchema.safeParse('image').success).toBe(true)
  })
  it('rejects invalid source types', () => {
    expect(sourceTypeSchema.safeParse('video').success).toBe(false)
    expect(sourceTypeSchema.safeParse('').success).toBe(false)
  })
})

describe('recipeFormSchema', () => {
  it('validates a valid recipe form', () => {
    const valid = { title: 'Test', ingredients: ['a'], instructions: ['b'] }
    expect(recipeFormSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional notes and tags', () => {
    const valid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      notes: 'some notes',
      tags: ['tag1', 'tag2'],
    }
    expect(recipeFormSchema.safeParse(valid).success).toBe(true)
  })

  it('defaults tags to empty array', () => {
    const valid = { title: 'Test', ingredients: ['a'], instructions: ['b'] }
    const result = recipeFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('rejects empty title', () => {
    const invalid = { title: '', ingredients: ['a'], instructions: ['b'] }
    expect(recipeFormSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects empty ingredients array', () => {
    const invalid = { title: 'Test', ingredients: [], instructions: ['b'] }
    expect(recipeFormSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects empty instructions array', () => {
    const invalid = { title: 'Test', ingredients: ['a'], instructions: [] }
    expect(recipeFormSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects ingredients with empty strings', () => {
    const invalid = { title: 'Test', ingredients: [''], instructions: ['b'] }
    expect(recipeFormSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing title', () => {
    const invalid = { ingredients: ['a'], instructions: ['b'] }
    expect(recipeFormSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('recipeInsertSchema', () => {
  it('validates a valid insert with source_type', () => {
    const valid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'manual' as const,
    }
    expect(recipeInsertSchema.safeParse(valid).success).toBe(true)
  })

  it('validates link source with URL', () => {
    const valid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'link' as const,
      source_url: 'https://example.com',
    }
    expect(recipeInsertSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid URL', () => {
    const invalid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'link' as const,
      source_url: 'not-a-url',
    }
    expect(recipeInsertSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing source_type', () => {
    const invalid = { title: 'Test', ingredients: ['a'], instructions: ['b'] }
    expect(recipeInsertSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('recipeSchema (full)', () => {
  it('validates a complete recipe', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'manual' as const,
      cover_image_path: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(recipeSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects non-UUID id', () => {
    const invalid = {
      id: 'not-a-uuid',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      source_type: 'manual' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    expect(recipeSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('aiRecipeExtractionSchema', () => {
  it('validates a valid AI extraction', () => {
    const valid = {
      title: 'Test Recipe',
      ingredients: ['flour', 'sugar'],
      instructions: ['mix', 'bake'],
      notes: 'some notes',
      original_text: 'original text here',
      confidence: 'high' as const,
      is_recipe: true,
    }
    expect(aiRecipeExtractionSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all confidence levels', () => {
    const base = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      notes: '',
      original_text: '',
      is_recipe: true,
    }
    expect(aiRecipeExtractionSchema.safeParse({ ...base, confidence: 'high' }).success).toBe(true)
    expect(aiRecipeExtractionSchema.safeParse({ ...base, confidence: 'medium' }).success).toBe(true)
    expect(aiRecipeExtractionSchema.safeParse({ ...base, confidence: 'low' }).success).toBe(true)
  })

  it('rejects invalid confidence level', () => {
    const invalid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      notes: '',
      original_text: '',
      confidence: 'very_high',
      is_recipe: true,
    }
    expect(aiRecipeExtractionSchema.safeParse(invalid).success).toBe(false)
  })

  it('accepts missing original_text and defaults to empty string', () => {
    const valid = {
      title: 'Test',
      ingredients: ['a'],
      instructions: ['b'],
      notes: '',
      confidence: 'high' as const,
      is_recipe: true,
    }
    const result = aiRecipeExtractionSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.original_text).toBe('')
    }
  })

  it('rejects missing required fields', () => {
    expect(aiRecipeExtractionSchema.safeParse({ title: 'Test' }).success).toBe(false)
    expect(aiRecipeExtractionSchema.safeParse({}).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('validates valid credentials', () => {
    const valid = { email: 'test@example.com', password: '123456' }
    expect(loginSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid email', () => {
    const invalid = { email: 'not-email', password: '123456' }
    expect(loginSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects short password', () => {
    const invalid = { email: 'test@example.com', password: '12345' }
    expect(loginSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('validates valid signup data', () => {
    const valid = { email: 'test@example.com', password: '123456', displayName: 'John' }
    expect(signupSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty displayName', () => {
    const invalid = { email: 'test@example.com', password: '123456', displayName: '' }
    expect(signupSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects missing displayName', () => {
    const invalid = { email: 'test@example.com', password: '123456' }
    expect(signupSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('validates valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'test@example.com' }).success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('validates matching passwords', () => {
    const valid = { password: '123456', confirmPassword: '123456' }
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects non-matching passwords', () => {
    const invalid = { password: '123456', confirmPassword: '654321' }
    expect(resetPasswordSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects short passwords', () => {
    const invalid = { password: '12345', confirmPassword: '12345' }
    expect(resetPasswordSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('parseUrlRequestSchema', () => {
  it('validates a valid URL', () => {
    expect(parseUrlRequestSchema.safeParse({ url: 'https://example.com' }).success).toBe(true)
  })

  it('rejects invalid URL', () => {
    expect(parseUrlRequestSchema.safeParse({ url: 'not-a-url' }).success).toBe(false)
  })

  it('rejects missing URL', () => {
    expect(parseUrlRequestSchema.safeParse({}).success).toBe(false)
  })
})

describe('parseImageRequestSchema', () => {
  it('validates valid image data', () => {
    const valid = { imageBase64: 'abc123', mediaType: 'image/jpeg' as const }
    expect(parseImageRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all valid media types', () => {
    const base = { imageBase64: 'abc123' }
    expect(parseImageRequestSchema.safeParse({ ...base, mediaType: 'image/jpeg' }).success).toBe(true)
    expect(parseImageRequestSchema.safeParse({ ...base, mediaType: 'image/png' }).success).toBe(true)
    expect(parseImageRequestSchema.safeParse({ ...base, mediaType: 'image/webp' }).success).toBe(true)
  })

  it('rejects invalid media type', () => {
    const invalid = { imageBase64: 'abc123', mediaType: 'image/gif' }
    expect(parseImageRequestSchema.safeParse(invalid).success).toBe(false)
  })

  it('rejects empty imageBase64', () => {
    const invalid = { imageBase64: '', mediaType: 'image/jpeg' }
    expect(parseImageRequestSchema.safeParse(invalid).success).toBe(false)
  })
})
