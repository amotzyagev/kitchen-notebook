import { TAGS_DESCRIPTION } from './client'

/**
 * Shared tool definition for structured recipe extraction via Claude tool_use.
 *
 * - parse-recipe-url uses SAVE_RECIPE_TOOL_WITH_TEXT (includes original_text)
 * - parse-recipe-image uses SAVE_RECIPE_TOOL (no original_text — injected manually after extraction)
 */

const BASE_PROPERTIES = {
  title: { type: 'string', description: 'Recipe title' },
  ingredients: {
    type: 'array',
    items: { type: 'string' },
    description: 'List of ingredients',
  },
  instructions: {
    type: 'array',
    items: { type: 'string' },
    description: 'Ordered list of preparation steps',
  },
  notes: { type: 'string', description: 'Additional notes, tips, or serving suggestions' },
  tags: {
    type: 'array',
    items: { type: 'string' },
    description: TAGS_DESCRIPTION,
  },
  confidence: {
    type: 'string',
    enum: ['high', 'medium', 'low'],
    description: 'Confidence level in the extraction quality',
  },
  is_recipe: {
    type: 'boolean',
    description: 'Whether the content contains a recipe',
  },
}

const BASE_REQUIRED: string[] = ['title', 'ingredients', 'instructions', 'notes', 'tags', 'confidence', 'is_recipe']

/** Tool definition without original_text (used by image extraction). */
export const SAVE_RECIPE_TOOL = {
  name: 'save_recipe' as const,
  description: 'Save the extracted recipe data',
  input_schema: {
    type: 'object' as const,
    properties: BASE_PROPERTIES,
    required: [...BASE_REQUIRED],
  },
}

/** Tool definition for URL/text extraction (original_text supplied by caller, not the AI). */
export const SAVE_RECIPE_TOOL_WITH_TEXT = {
  name: 'save_recipe' as const,
  description: 'Save the extracted recipe data',
  input_schema: {
    type: 'object' as const,
    properties: BASE_PROPERTIES,
    required: [...BASE_REQUIRED],
  },
}
