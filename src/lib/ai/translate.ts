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
      original_text: { type: 'string', description: 'The original text before translation (keep as-is)' },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence level in the translation quality',
      },
      is_recipe: {
        type: 'boolean',
        description: 'Whether the content contains a recipe',
      },
    },
    required: ['title', 'ingredients', 'instructions', 'notes', 'original_text', 'confidence', 'is_recipe'],
  },
}

export async function translateRecipe(extraction: AIRecipeExtraction): Promise<AIRecipeExtraction> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are a translation assistant specializing in recipe translation to Hebrew.
Translate all recipe fields (title, ingredients, instructions, notes) to Hebrew.
Keep the original_text field exactly as-is without translation.
Maintain the same structure and number of items in arrays.
Use natural Hebrew cooking terminology.
Keep measurements in their original units but write the unit names in Hebrew where appropriate.`,
    tools: [SAVE_TRANSLATED_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Translate this recipe to Hebrew. Keep original_text unchanged. Use the save_translated_recipe tool.

Title: ${extraction.title}

Ingredients:
${extraction.ingredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Instructions:
${extraction.instructions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Notes: ${extraction.notes}

Original text: ${extraction.original_text}

Confidence: ${extraction.confidence}
Is recipe: ${extraction.is_recipe}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('AI did not return translated recipe data')
  }

  return aiRecipeExtractionSchema.parse(toolUseBlock.input)
}
