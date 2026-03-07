import { anthropic } from './client'
import { aiRecipeExtractionSchema, type AIRecipeExtraction } from '@/lib/validators/ai-response'

const SAVE_TRANSLATED_RECIPE_TOOL = {
  name: 'save_translated_recipe' as const,
  description: 'Save the translated recipe data in Hebrew',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Recipe title translated to Hebrew' },
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of ingredients translated to Hebrew',
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered list of preparation steps translated to Hebrew',
      },
      notes: { type: 'string', description: 'Additional notes translated to Hebrew' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Category tags for the recipe in Hebrew (e.g., קינוח, אפייה, מאפים, סלט, מרק, בשרי, צמחוני, טבעוני, ארוחת בוקר)',
      },
    },
    required: ['title', 'ingredients', 'instructions', 'notes', 'tags'],
  },
}

export function isHebrew(text: string): boolean {
  const hebrewChars = text.match(/[\u0590-\u05FF]/g) || []
  const latinChars = text.match(/[a-zA-Z]/g) || []
  return hebrewChars.length > latinChars.length
}

export async function translateRecipe(extraction: AIRecipeExtraction): Promise<AIRecipeExtraction> {
  // Skip translation if content is already in Hebrew
  const sampleText = [extraction.title, ...extraction.ingredients.slice(0, 3)].join(' ')
  if (isHebrew(sampleText)) {
    console.log('[translate] Content already in Hebrew, skipping translation')
    return extraction
  }

  console.log('[translate] Translating to Hebrew...')
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are a translation assistant specializing in recipe translation to Hebrew.
Translate all recipe fields (title, ingredients, instructions, notes, tags) to Hebrew.
Do NOT include original_text, confidence, or is_recipe in your response - only translate the recipe content fields.
Maintain the same structure and number of items in arrays.
Use natural Hebrew cooking terminology.
Keep measurements in their original units but write the unit names in Hebrew where appropriate.`,
    tools: [SAVE_TRANSLATED_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Translate this recipe to Hebrew. Use the save_translated_recipe tool with only title, ingredients, instructions, notes, and tags.

Title: ${extraction.title}

Ingredients:
${extraction.ingredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Instructions:
${extraction.instructions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Notes: ${extraction.notes}

Tags: ${extraction.tags.join(', ')}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('AI did not return translated recipe data')
  }

  const translated = toolUseBlock.input as Record<string, unknown>
  return aiRecipeExtractionSchema.parse({
    ...translated,
    original_text: extraction.original_text,
    confidence: extraction.confidence,
    is_recipe: extraction.is_recipe,
  })
}
