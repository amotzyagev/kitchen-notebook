import dns from 'node:dns'
import * as cheerio from 'cheerio'
import { anthropic, TAGS_DESCRIPTION, MODEL_HAIKU, AI_MAX_TOKENS } from './client'
import { aiRecipeExtractionSchema, type AIRecipeExtraction } from '@/lib/validators/ai-response'
import { SAVE_RECIPE_TOOL_WITH_TEXT as SAVE_RECIPE_TOOL } from './tools'

interface SchemaOrgRecipe {
  name?: string
  recipeIngredient?: string[]
  recipeInstructions?: (string | { text?: string; '@type'?: string })[]
  description?: string
}

function isPrivateIP(ip: string): boolean {
  const normalized = ip.toLowerCase()

  // IPv6 loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true

  // IPv6 private ranges (case-insensitive)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // ULA fc00::/7
  if (normalized.startsWith('fe80')) return true // Link-local fe80::/10

  // Parse IPv4 (handles plain IPv4, ::ffff:x.x.x.x, and ::ffff:0:x.x.x.x)
  const v4Match = normalized.match(/(?:::ffff:(?:0:)?)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!v4Match) return false

  const [a, b] = [parseInt(v4Match[1], 10), parseInt(v4Match[2], 10)]

  return (
    a === 127 ||              // 127.0.0.0/8 loopback
    a === 10 ||               // 10.0.0.0/8 private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) ||          // 192.168.0.0/16 private
    (a === 169 && b === 254) ||          // 169.254.0.0/16 link-local
    a === 0                   // 0.0.0.0/8
  )
}

async function validateUrl(url: string): Promise<void> {
  const ERROR_MESSAGE = 'כתובת URL לא חוקית או חסומה'

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(ERROR_MESSAGE)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(ERROR_MESSAGE)
  }

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost') {
    throw new Error(ERROR_MESSAGE)
  }

  // Resolve hostname and check for private/reserved IPs
  try {
    const results = await dns.promises.lookup(hostname, { all: true })
    for (const result of results) {
      if (isPrivateIP(result.address)) {
        throw new Error(ERROR_MESSAGE)
      }
    }
  } catch (err) {
    // Re-throw our own error; wrap DNS failures
    if (err instanceof Error && err.message === ERROR_MESSAGE) {
      throw err
    }
    throw new Error(ERROR_MESSAGE)
  }
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
    model: MODEL_HAIKU,
    max_tokens: AI_MAX_TOKENS,
    system: `You are a recipe extraction assistant. Extract structured recipe data from the provided text. The text may contain blog content, stories, and other non-recipe text — focus on finding and extracting ONLY the recipe parts: title, ingredients list, and preparation instructions. Look for sections labeled with words like "חומרים" (ingredients), "הכנה" (preparation), or similar markers.

If the recipe has multiple stages or components (e.g., sauce, dough, filling, salad, topping), group the ingredients by stage. Insert a header string ending with ":" before each group — for example: "לרוטב:", "לבצק:", "לסלט:". If the recipe is simple with one stage, just list ingredients normally without headers.`,
    tools: [SAVE_RECIPE_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this text. ${TAGS_DESCRIPTION} Use the save_recipe tool to return the structured data.\n\n${truncatedText}`,
      },
    ],
  })

  console.log('[ai] AI response received, stop_reason:', response.stop_reason)

  const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    console.error('[ai] No tool_use block in response:', JSON.stringify(response.content))
    throw new Error('AI did not return structured recipe data')
  }

  console.log('[ai] Tool input keys:', Object.keys(toolUseBlock.input as Record<string, unknown>))

  const parsed = aiRecipeExtractionSchema.safeParse(toolUseBlock.input)
  if (!parsed.success) {
    console.error('[ai] Zod validation failed:', JSON.stringify(parsed.error.issues))
    console.error('[ai] Raw input:', JSON.stringify(toolUseBlock.input))
    throw parsed.error
  }

  // If the AI didn't return original_text (e.g. hit max_tokens), use the source text
  if (!parsed.data.original_text) {
    parsed.data.original_text = truncatedText
  }

  return parsed.data
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
        Referer: 'https://www.google.com/',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
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

async function fetchWithJina(url: string): Promise<string | null> {
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
      console.log('[fetch] Jina Reader returned non-OK status:', response.status)
      return null
    }
    const markdown = await response.text()
    console.log('[fetch] Jina markdown length:', markdown.length)
    if (markdown.length < 1000) {
      console.log('[fetch] Jina Reader returned too little content')
      return null
    }
    return markdown
  } catch (err) {
    console.error('[fetch] Jina Reader error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.log('[fetch] FIRECRAWL_API_KEY not set, skipping Firecrawl')
    return null
  }
  console.log('[fetch] Trying Firecrawl for:', url)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    })
    console.log('[fetch] Firecrawl status:', response.status)
    if (!response.ok) {
      console.log('[fetch] Firecrawl returned non-OK status:', response.status)
      return null
    }
    const body = await response.json()
    const markdown = body?.data?.markdown
    if (!markdown || markdown.length < 1000) {
      console.log('[fetch] Firecrawl returned too little content')
      return null
    }
    console.log('[fetch] Firecrawl markdown length:', markdown.length)
    return markdown
  } catch (err) {
    console.error('[fetch] Firecrawl error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchFromWayback(url: string): Promise<string | null> {
  console.log('[fetch] Trying Wayback Machine for:', url)
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    // Step 1: Query CDX API for latest snapshot
    const cdxController = new AbortController()
    timeout = setTimeout(() => cdxController.abort(), 15000)
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&limit=1&sort=reverse`
    const cdxResponse = await fetch(cdxUrl, { signal: cdxController.signal })
    clearTimeout(timeout)
    console.log('[fetch] Wayback CDX status:', cdxResponse.status)
    if (!cdxResponse.ok) {
      console.log('[fetch] Wayback CDX returned non-OK status:', cdxResponse.status)
      return null
    }
    const cdxData = await cdxResponse.json()
    if (!Array.isArray(cdxData) || cdxData.length < 2) {
      console.log('[fetch] No Wayback snapshots found')
      return null
    }
    const timestamp = cdxData[1][1]
    console.log('[fetch] Wayback snapshot timestamp:', timestamp)

    // Step 2: Fetch the archived HTML
    const htmlController = new AbortController()
    timeout = setTimeout(() => htmlController.abort(), 30000)
    const waybackUrl = `https://web.archive.org/web/${timestamp}id_/${url}`
    const htmlResponse = await fetch(waybackUrl, { signal: htmlController.signal })
    clearTimeout(timeout)
    console.log('[fetch] Wayback HTML status:', htmlResponse.status)
    if (!htmlResponse.ok) {
      console.log('[fetch] Wayback HTML returned non-OK status:', htmlResponse.status)
      return null
    }
    const html = await htmlResponse.text()
    console.log('[fetch] Wayback HTML length:', html.length)
    return html
  } catch (err) {
    console.error('[fetch] Wayback error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function parseRecipeUrl(url: string): Promise<AIRecipeExtraction> {
  await validateUrl(url)

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
    console.log('[parse] Cheerio extraction too short or empty, trying fallbacks')
  }

  // Fallback chain for when direct fetch fails or has no usable content
  const jinaMarkdown = await fetchWithJina(url)
  if (jinaMarkdown) {
    console.log('[parse] Using Jina markdown for AI extraction')
    const result = await extractWithAI(jinaMarkdown)
    if (result.is_recipe) return result
    console.log('[parse] Jina content not recognized as recipe, trying next fallback')
  }

  const waybackHtml = await fetchFromWayback(url)
  if (waybackHtml) {
    const jsonLdRecipe = extractJsonLdRecipe(waybackHtml)
    if (jsonLdRecipe && jsonLdRecipe.name) {
      console.log('[parse] Found JSON-LD recipe in Wayback snapshot:', jsonLdRecipe.name)
      const mapped = mapSchemaOrgToExtraction(jsonLdRecipe)
      return { ...mapped, confidence: 'high', is_recipe: true }
    }
    const cleanText = extractTextWithCheerio(waybackHtml)
    if (cleanText && cleanText.length > 100) {
      console.log('[parse] Using Wayback cheerio text, length:', cleanText.length)
      const result = await extractWithAI(cleanText)
      if (result.is_recipe) return result
      console.log('[parse] Wayback content not recognized as recipe, trying next fallback')
    }
  }

  // Firecrawl as last resort (limited free tier: 500 scrapes/month)
  const firecrawlMarkdown = await fetchWithFirecrawl(url)
  if (firecrawlMarkdown) {
    console.log('[parse] Using Firecrawl markdown for AI extraction')
    return extractWithAI(firecrawlMarkdown)
  }

  throw new Error('לא הצלחתי להוריד את הדף – האתר חוסם גישה אוטומטית. נסו להעתיק את טקסט המתכון ולהדביק אותו ישירות.')
}
