import { anthropic } from './client'
import { aiRecipeExtractionSchema, type AIRecipeExtraction } from '@/lib/validators/ai-response'

const SAVE_RECIPE_TOOL = {
  name: 'save_recipe' as const,
  description: 'Save the extracted recipe data',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Recipe title in Hebrew' },
      ingredients: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of ingredients in Hebrew',
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered list of preparation steps in Hebrew',
      },
      notes: { type: 'string', description: 'Additional notes, tips, or serving suggestions in Hebrew' },
      original_text: { type: 'string', description: 'The raw OCR text extracted from the image before translation' },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence level in the extraction quality',
      },
      is_recipe: {
        type: 'boolean',
        description: 'Whether the image contains a recipe',
      },
    },
    required: ['title', 'ingredients', 'instructions', 'notes', 'original_text', 'confidence', 'is_recipe'],
  },
}

export async function parseRecipeImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<AIRecipeExtraction> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are a recipe extraction assistant. Your task is to:
1. OCR the image to extract any text
2. Determine if the image contains a recipe
3. If it does, extract the recipe details and translate everything to Hebrew
4. If the text is already in Hebrew, keep it as-is
5. Set is_recipe to false if the image does not contain a recipe
6. Always provide the raw OCR text in original_text before any translation`,
    tools: [SAVE_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Extract the recipe from this image. OCR the text, then translate to Hebrew. Use the save_recipe tool to return the structured data.',
          },
        ],
      },
    ],
  })

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('AI did not return structured recipe data')
  }

  const parsed = aiRecipeExtractionSchema.parse(toolUseBlock.input)
  return parsed
}
