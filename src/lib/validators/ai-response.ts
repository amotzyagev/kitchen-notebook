import { z } from 'zod';

// Claude tool use output schema
export const aiRecipeExtractionSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  notes: z.string(),
  tags: z.array(z.string()).default([]),
  original_text: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  is_recipe: z.boolean(),
});

export type AIRecipeExtraction = z.infer<typeof aiRecipeExtractionSchema>;
