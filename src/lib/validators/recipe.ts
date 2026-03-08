import { z } from 'zod';

export const sourceTypeSchema = z.enum(['manual', 'link', 'image', 'import']);

// Form validation (user input)
export const recipeFormSchema = z.object({
  title: z.string().min(1, 'כותרת נדרשת').max(500, 'כותרת ארוכה מדי'),
  ingredients: z.array(z.string().min(1).max(1000)).max(200).min(1, 'נדרש לפחות מרכיב אחד'),
  instructions: z.array(z.string().min(1).max(5000)).max(100).min(1, 'נדרש לפחות שלב אחד'),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(30).default([]),
});

// Database insert (form + source metadata)
export const recipeInsertSchema = recipeFormSchema.extend({
  source_type: sourceTypeSchema,
  source_url: z.string().url().max(2000).optional(),
  source_image_path: z.string().max(500).optional(),
  cover_image_path: z.string().max(500).nullable().optional(),
  original_text: z.string().max(100000).optional(),
}).refine(
  (data) => data.source_type !== 'link' || (data.source_url != null && data.source_url.length > 0),
  { message: 'כתובת URL נדרשת למתכון מקישור', path: ['source_url'] }
);

// Full recipe from database
export const recipeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  ingredients: z.array(z.string().min(1).max(1000)).max(200).min(1),
  instructions: z.array(z.string().min(1).max(5000)).max(100).min(1),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(100)).max(30).default([]),
  source_type: sourceTypeSchema,
  source_url: z.string().url().max(2000).optional(),
  source_image_path: z.string().max(500).optional(),
  cover_image_path: z.string().max(500).nullable(),
  original_text: z.string().max(100000).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RecipeForm = z.infer<typeof recipeFormSchema>;
export type RecipeInsert = z.infer<typeof recipeInsertSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
