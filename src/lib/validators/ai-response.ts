import { z } from 'zod';

// Coerce a value that may be a single string into an array of strings
const stringOrArray = z.union([
  z.array(z.string()),
  z.string().transform((s) => s.split('\n').map((l) => l.trim()).filter(Boolean)),
]);

// Claude tool use output schema
export const aiRecipeExtractionSchema = z.object({
  title: z.string(),
  ingredients: stringOrArray,
  instructions: stringOrArray,
  notes: z.string(),
  tags: z.array(z.string()).default([]),
  original_text: z.string().optional().default(''),
  confidence: z.enum(['high', 'medium', 'low']),
  is_recipe: z.boolean(),
});

export type AIRecipeExtraction = z.infer<typeof aiRecipeExtractionSchema>;
