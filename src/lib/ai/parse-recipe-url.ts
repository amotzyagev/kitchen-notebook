import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
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
    required: ['title', 'ingredients', 'instructions', 'notes', 'original_text', 'confidence', 'is_recipe'],
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

  return { title, ingredients, instructions, notes, original_text: originalText }
}

async function extractWithReadability(html: string, url: string): Promise<string | null> {
  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  return article?.textContent?.trim() || null
}

async function extractWithAI(text: string): Promise<AIRecipeExtraction> {
  const truncatedText = text.slice(0, 10000)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are a recipe extraction assistant. Extract structured recipe data from the provided text. Identify the title, ingredients, instructions, and any notes.`,
    tools: [SAVE_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this text. Use the save_recipe tool to return the structured data.\n\n${truncatedText}`,
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
      console.log('[fetch] Blocked by server, will try browser fallback')
      return null
    }
    const html = await response.text()
    console.log('[fetch] HTML length:', html.length)
    if (html.length < 500) {
      console.log('[fetch] HTML too short, will try browser fallback')
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

async function fetchWithBrowser(url: string): Promise<string> {
  console.log('[fetch] Launching headless browser for:', url)
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })
    const html = await page.content()
    console.log('[fetch] Browser fetched HTML length:', html.length)
    return html
  } catch (err) {
    console.error('[fetch] Browser fetch error:', err instanceof Error ? err.message : err)
    throw err
  } finally {
    await browser.close()
  }
}

function extractRecipeFromHtml(html: string, url: string): Promise<AIRecipeExtraction> | AIRecipeExtraction | null {
  // Try JSON-LD first
  const jsonLdRecipe = extractJsonLdRecipe(html)
  if (jsonLdRecipe && jsonLdRecipe.name) {
    const mapped = mapSchemaOrgToExtraction(jsonLdRecipe)
    return {
      ...mapped,
      confidence: 'high',
      is_recipe: true,
    }
  }
  return null
}

export async function parseRecipeUrl(url: string): Promise<AIRecipeExtraction> {
  // Step 1: Try simple fetch first (fast, no overhead)
  let html = await fetchSimple(url)

  // Step 2: If simple fetch failed, use headless browser
  if (!html) {
    html = await fetchWithBrowser(url)
  }

  // Step 3: Try JSON-LD extraction
  const jsonLdResult = extractRecipeFromHtml(html, url)
  if (jsonLdResult) {
    return jsonLdResult instanceof Promise ? await jsonLdResult : jsonLdResult
  }

  // Step 4: Fallback to Readability + AI
  const cleanText = await extractWithReadability(html, url)
  if (!cleanText) {
    throw new Error('Could not extract content from page')
  }

  return extractWithAI(cleanText)
}
