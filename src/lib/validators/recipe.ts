import { z } from 'zod';

export const sourceTypeSchema = z.enum(['manual', 'link', 'image']);

// Form validation (user input)
export const recipeFormSchema = z.object({
  title: z.string().min(1, 'כותרת נדרשת'),
  ingredients: z.array(z.string().min(1)).min(1, 'נדרש לפחות מרכיב אחד'),
  instructions: z.array(z.string().min(1)).min(1, 'נדרש לפחות שלב אחד'),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Database insert (form + source metadata)
export const recipeInsertSchema = recipeFormSchema.extend({
  source_type: sourceTypeSchema,
  source_url: z.string().url().optional(),
  source_image_path: z.string().optional(),
  original_text: z.string().optional(),
});

// Full recipe from database
export const recipeSchema = recipeInsertSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RecipeForm = z.infer<typeof recipeFormSchema>;
export type RecipeInsert = z.infer<typeof recipeInsertSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
