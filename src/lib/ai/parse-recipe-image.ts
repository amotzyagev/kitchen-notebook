import { anthropic } from './client'
import { aiRecipeExtractionSchema, type AIRecipeExtraction } from '@/lib/validators/ai-response'
import { translateRecipe, isHebrew } from './translate'

const SAVE_RECIPE_TOOL = {
  name: 'save_recipe' as const,
  description: 'Save the extracted recipe data',
  input_schema: {
    type: 'object' as const,
    properties: {
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
        description: 'Category tags for the recipe in Hebrew (e.g., קינוח, אפייה, מאפים, סלט, מרק, בשרי, צמחוני, טבעוני, ארוחת בוקר)',
      },
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
    required: ['title', 'ingredients', 'instructions', 'notes', 'tags', 'confidence', 'is_recipe'],
  },
}

async function ocrWithGoogleVision(imageBase64: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) {
    console.log('[parse-image] Google Cloud Vision API key not set, skipping')
    return null
  }

  console.log('[parse-image] Step 1: OCR with Google Cloud Vision')
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['he', 'en'] },
          },
        ],
      }),
    }
  )

  if (!res.ok) {
    console.error('[parse-image] Google Vision error:', res.status, await res.text())
    return null
  }

  const data = await res.json() as {
    responses: Array<{
      fullTextAnnotation?: { text: string }
      error?: { message: string }
    }>
  }
  const annotation = data.responses?.[0]?.fullTextAnnotation
  if (!annotation?.text) {
    console.log('[parse-image] Google Vision returned no text')
    return null
  }

  console.log('[parse-image] Google Vision OCR result length:', annotation.text.length)
  return annotation.text
}

async function ocrWithClaude(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<string> {
  console.log('[parse-image] Step 1: OCR with Claude Vision (fallback)')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are an OCR assistant. Your ONLY job is to read and transcribe ALL text visible in the image, exactly as written.
- Transcribe every single line of text you see - do not skip anything
- Preserve the original language (do not translate)
- Preserve line breaks and structure
- Include ingredient quantities, measurements, and units exactly as written
- For handwritten text, do your best to read each word carefully
- If text is unclear, make your best guess and mark it with [?]
- Do NOT add any commentary, formatting, or interpretation - just the raw text`,
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
            text: 'Read and transcribe ALL text visible in this image, exactly as written. Include every line.',
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('OCR did not return text')
  }

  console.log('[parse-image] Claude OCR result length:', textBlock.text.length)
  return textBlock.text
}

async function ocrImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<string> {
  // Try Google Cloud Vision first (better Hebrew accuracy)
  const googleResult = await ocrWithGoogleVision(imageBase64)
  if (googleResult) return googleResult

  // Fall back to Claude Vision
  return ocrWithClaude(imageBase64, mediaType)
}

async function extractRecipeFromText(ocrText: string): Promise<AIRecipeExtraction> {
  console.log('[parse-image] Step 2: Extracting structured recipe from OCR text')
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a recipe extraction assistant. Given raw OCR text from an image, extract the structured recipe data.
1. Determine if the text contains a recipe (ingredient lists, cooking instructions, or similar food preparation content)
2. If it does, extract ALL recipe details completely — do not skip or summarize ingredients or steps
3. If the recipe has multiple stages or components (e.g., sauce, dough, filling, salad, topping), group the ingredients by stage. Insert a header string ending with ":" before each group — for example: "לרוטב:", "לבצק:", "לסלט:". If the recipe is simple with one stage, just list ingredients normally without headers.
4. Keep the text in its original language — do not translate
5. Fix obvious OCR errors (typos, garbled characters) based on context
6. Set is_recipe to false ONLY if the text truly does not contain any recipe content`,
    tools: [SAVE_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this OCR text. Fix any obvious OCR errors. Use the save_recipe tool.\n\n${ocrText}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('AI did not return structured recipe data')
  }

  const input = toolUseBlock.input as Record<string, unknown>
  return aiRecipeExtractionSchema.parse({
    ...input,
    original_text: ocrText,
  })
}

export async function parseRecipeImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<AIRecipeExtraction> {
  // Step 1: OCR - read all text from image
  const ocrText = await ocrImage(imageBase64, mediaType)

  // Step 2: Extract structured recipe from OCR text
  const extracted = await extractRecipeFromText(ocrText)

  if (!extracted.is_recipe) {
    return extracted
  }

  // Step 3: Translate to Hebrew if needed (includes refinement pass)
  const sampleText = [extracted.title, ...extracted.ingredients.slice(0, 3)].join(' ')
  if (!isHebrew(sampleText)) {
    console.log('[parse-image] Text not in Hebrew, translating...')
    return translateRecipe(extracted)
  }

  return extracted
}
