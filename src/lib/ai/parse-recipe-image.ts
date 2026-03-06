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
    max_tokens: 4096,
    system: `You are a recipe extraction assistant specializing in reading recipes from images. Your task is to:
1. Carefully OCR ALL text visible in the image — pay close attention to every line, ingredient, and instruction
2. The image may be a screenshot of a social media post (Instagram, Facebook, etc.), a photo of a cookbook page, a handwritten recipe, or any other format containing recipe text
3. Determine if the image contains a recipe (ingredient lists, cooking instructions, or similar food preparation content)
4. If it does, extract ALL recipe details completely — do not skip or summarize ingredients or steps
5. If the text is already in Hebrew, keep it exactly as-is
6. If the text is in another language, translate everything to Hebrew
7. Set is_recipe to false ONLY if the image truly does not contain any recipe or food preparation content
8. Always provide the complete raw OCR text in original_text before any translation`,
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
            text: 'Carefully read ALL text in this image and extract the complete recipe. The image may be a screenshot of a social media post, a cookbook photo, or any other source. OCR every line of text, especially ingredients and instructions. If the text is already in Hebrew, keep it as-is. Use the save_recipe tool to return the structured data.',
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
