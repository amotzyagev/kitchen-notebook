import * as cheerio from 'cheerio'
import { anthropic } from './client'
import { aiRecipeExtractionSchema, type AIRecipeExtraction } from '@/lib/validators/ai-response'

interface SchemaOrgRecipe {
  name?: string
  recipeIngredient?: string[]
  recipeInstructions?: (string | { text?: string; '@type'?: string })[]
  description?: string
}

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
      notes: { type: 'string', description: 'Additional notes or tips' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Category tags for the recipe in Hebrew (e.g., קינוח, אפייה, מאפים, סלט, מרק, בשרי, צמחוני, טבעוני, ארוחת בוקר)',
      },
      original_text: { type: 'string', description: 'The original extracted text' },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Confidence level in the extraction quality',
      },
      is_recipe: {
        type: 'boolean',
        description: 'Whether the content contains a recipe',
      },
    },
    required: ['title', 'ingredients', 'instructions', 'notes', 'tags', 'original_text', 'confidence', 'is_recipe'],
  },
}

function extractJsonLdRecipe(html: string): SchemaOrgRecipe | null {
  const $ = cheerio.load(html)
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const text = $(scripts[i]).html()
      if (!text) continue

      const data = JSON.parse(text)

      // Direct Recipe object
      if (data['@type'] === 'Recipe') {
        return data as SchemaOrgRecipe
      }

      // @graph array
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        const recipe = data['@graph'].find(
          (item: Record<string, unknown>) => item['@type'] === 'Recipe'
        )
        if (recipe) return recipe as SchemaOrgRecipe
      }

      // Array of objects
      if (Array.isArray(data)) {
        const recipe = data.find(
          (item: Record<string, unknown>) => item['@type'] === 'Recipe'
        )
        if (recipe) return recipe as SchemaOrgRecipe
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  return null
}

function mapSchemaOrgToExtraction(recipe: SchemaOrgRecipe): Omit<AIRecipeExtraction, 'confidence' | 'is_recipe'> {
  const title = recipe.name || ''

  const ingredients = recipe.recipeIngredient || []

  const instructions = (recipe.recipeInstructions || []).map((step) => {
    if (typeof step === 'string') return step
    if (step.text) return step.text
    return String(step)
  })

  const notes = recipe.description || ''

  const originalText = [
    title,
    '',
    'Ingredients:',
    ...ingredients,
    '',
    'Instructions:',
    ...instructions,
  ].join('\n')

  return { title, ingredients, instructions, notes, tags: [], original_text: originalText }
}

function extractTextWithCheerio(html: string): string | null {
  const $ = cheerio.load(html)
  // Remove non-content elements
  $('script, style, nav, footer, header, iframe, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  return text.length > 100 ? text : null
}

function cleanMarkdown(text: string): string {
  // Remove common boilerplate patterns from Jina Reader output
  const lines = text.split('\n')
  const cleaned: string[] = []
  let skipBlock = false

  for (const line of lines) {
    // Skip cookie consent, navigation, and marketing blocks
    if (/^(Manage Consent|To provide the best experiences|Functional|Preferences|Statistics|Marketing|The technical storage|Accept Deny|Save preferences)/i.test(line.trim())) {
      skipBlock = true
      continue
    }
    // Skip image-only lines
    if (/^\[!\[Image \d+/.test(line.trim()) && !line.includes('חומרים') && !line.includes('הכנה')) {
      continue
    }
    if (skipBlock) {
      if (line.trim() === '' || line.startsWith('[') || line.startsWith('- [')) continue
      skipBlock = false
    }
    cleaned.push(line)
  }
  return cleaned.join('\n').trim()
}

export async function extractWithAI(text: string): Promise<AIRecipeExtraction> {
  const cleaned = cleanMarkdown(text)
  const truncatedText = cleaned.slice(0, 30000)
  console.log('[ai] Sending text to AI, length:', truncatedText.length)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You are a recipe extraction assistant. Extract structured recipe data from the provided text. The text may contain blog content, stories, and other non-recipe text — focus on finding and extracting ONLY the recipe parts: title, ingredients list, and preparation instructions. Look for sections labeled with words like "חומרים" (ingredients), "הכנה" (preparation), or similar markers.

If the recipe has multiple stages or components (e.g., sauce, dough, filling, salad, topping), group the ingredients by stage. Insert a header string ending with ":" before each group — for example: "לרוטב:", "לבצק:", "לסלט:". If the recipe is simple with one stage, just list ingredients normally without headers.`,
    tools: [SAVE_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this text. Assign relevant category tags in Hebrew (e.g., קינוח, אפייה, סלט, מרק, בשרי, צמחוני). Use the save_recipe tool to return the structured data.\n\n${truncatedText}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('AI did not return structured recipe data')
  }

  return aiRecipeExtractionSchema.parse(toolUseBlock.input)
}

async function fetchSimple(url: string): Promise<string | null> {
  console.log('[fetch] Trying simple fetch for:', url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
      redirect: 'follow',
    })
    console.log('[fetch] Simple fetch status:', response.status)
    if (response.status === 403 || response.status === 401) {
      console.log('[fetch] Blocked by server, will try Jina Reader')
      return null
    }
    const html = await response.text()
    console.log('[fetch] HTML length:', html.length)
    if (html.length < 500) {
      console.log('[fetch] HTML too short, will try Jina Reader')
      return null
    }
    return html
  } catch (err) {
    console.error('[fetch] Simple fetch error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithJina(url: string): Promise<string> {
  console.log('[fetch] Trying Jina Reader for:', url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
      },
    })
    console.log('[fetch] Jina status:', response.status)
    if (!response.ok) {
      throw new Error(`Jina Reader returned ${response.status}`)
    }
    const markdown = await response.text()
    console.log('[fetch] Jina markdown length:', markdown.length)
    if (markdown.length < 100) {
      throw new Error('Jina Reader returned too little content')
    }
    return markdown
  } finally {
    clearTimeout(timeout)
  }
}

export async function parseRecipeUrl(url: string): Promise<AIRecipeExtraction> {
  // Step 1: Try simple fetch first (fast, free, no external dependency)
  const html = await fetchSimple(url)

  if (html) {
    // Step 2a: Try JSON-LD extraction from direct HTML
    const jsonLdRecipe = extractJsonLdRecipe(html)
    if (jsonLdRecipe && jsonLdRecipe.name) {
      console.log('[parse] Found JSON-LD recipe:', jsonLdRecipe.name)
      const mapped = mapSchemaOrgToExtraction(jsonLdRecipe)
      return {
        ...mapped,
        confidence: 'high',
        is_recipe: true,
      }
    }

    // Step 2b: Try cheerio text extraction + AI from direct HTML
    const cleanText = extractTextWithCheerio(html)
    if (cleanText && cleanText.length > 100) {
      console.log('[parse] Using cheerio text, length:', cleanText.length)
      return extractWithAI(cleanText)
    }
    console.log('[parse] Cheerio extraction too short or empty, trying Jina')
  }

  // Step 3: Fallback to Jina Reader (handles bot protection, JS rendering)
  const markdown = await fetchWithJina(url)
  console.log('[parse] Using Jina markdown for AI extraction')
  return extractWithAI(markdown)
}
