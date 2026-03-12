import { anthropic, TAGS_DESCRIPTION, MODEL_SONNET, AI_MAX_TOKENS } from './client'
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
        description: TAGS_DESCRIPTION,
      },
    },
    required: ['title', 'ingredients', 'instructions', 'notes', 'tags'],
  },
}

const REFINE_RECIPE_TOOL = {
  name: 'save_refined_recipe' as const,
  description: 'Save the refined Hebrew recipe text',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Refined recipe title in Hebrew' },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Refined preparation steps in natural Hebrew',
      },
      notes: { type: 'string', description: 'Refined notes in natural Hebrew' },
    },
    required: ['title', 'instructions', 'notes'],
  },
}

async function refineTranslation(translated: AIRecipeExtraction): Promise<AIRecipeExtraction> {
  console.log('[translate] Refining Hebrew translation...')
  try {
    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: AI_MAX_TOKENS,
      system: `You are a Hebrew language editor specializing in cooking content.
Review the translated recipe and improve the Hebrew phrasing.
Focus on making instructions read naturally, as if written by a native Hebrew speaker.
Fix literal translations, awkward phrasing, and ensure proper Hebrew cooking terminology.
Do not change the meaning, just improve how it reads in Hebrew.
Do not change ingredient names or quantities - only refine title, instructions, and notes.`,
      tools: [REFINE_RECIPE_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Review and refine this Hebrew recipe translation. Use the save_refined_recipe tool.

Title: ${translated.title}

Instructions:
${translated.instructions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Notes: ${translated.notes}`,
        },
      ],
    })

    const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      console.log('[translate] Refine pass did not return tool use, using first-pass result')
      return translated
    }

    const refined = toolUseBlock.input as { title: string; instructions: string[]; notes: string }
    console.log('[translate] Refinement complete')
    return {
      ...translated,
      title: refined.title || translated.title,
      instructions: refined.instructions || translated.instructions,
      notes: refined.notes ?? translated.notes,
    }
  } catch (err) {
    console.error('[translate] Refine error, using first-pass result:', err instanceof Error ? err.message : err)
    return translated
  }
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
    model: MODEL_SONNET,
    max_tokens: AI_MAX_TOKENS,
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
  const firstPass = aiRecipeExtractionSchema.parse({
    ...translated,
    original_text: extraction.original_text,
    confidence: extraction.confidence,
    is_recipe: extraction.is_recipe,
  })

  return refineTranslation(firstPass)
}
