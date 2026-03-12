import WordExtractor from 'word-extractor'
import { extractWithAI } from './parse-recipe-url'
import { parseRecipeImage } from './parse-recipe-image'
import { isHebrew } from './translate'
import { translateRecipe } from './translate'
import type { AIRecipeExtraction } from '@/lib/validators/ai-response'
import type { ValidImageType } from '@/lib/constants/image'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const TEXT_EXTENSIONS = ['.txt', '.md']

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function getMediaType(ext: string): ValidImageType {
  switch (ext) {
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    default: return 'image/jpeg'
  }
}

async function extractTextFromDocx(base64: string): Promise<string> {
  const mammoth = await import('mammoth')
  const buffer = Buffer.from(base64, 'base64')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractTextFromDoc(base64: string): Promise<string> {
  console.log('[parse-file] Extracting text from .doc with word-extractor')
  const extractor = new WordExtractor()
  const buffer = Buffer.from(base64, 'base64')
  console.log('[parse-file] Buffer size:', buffer.length)
  const doc = await extractor.extract(buffer)
  const body = doc.getBody()
  console.log('[parse-file] Extracted .doc text length:', body.length)
  return body
}

export async function parseRecipeFile(
  base64Content: string,
  filename: string,
): Promise<AIRecipeExtraction> {
  const ext = getExtension(filename)

  // Image files — use existing vision-based extraction
  if (IMAGE_EXTENSIONS.includes(ext)) {
    const mediaType = getMediaType(ext)
    return parseRecipeImage(base64Content, mediaType)
  }

  // Extract text based on file type
  let text: string
  if (TEXT_EXTENSIONS.includes(ext)) {
    text = Buffer.from(base64Content, 'base64').toString('utf-8')
  } else if (ext === '.docx') {
    text = await extractTextFromDocx(base64Content)
  } else if (ext === '.doc') {
    text = await extractTextFromDoc(base64Content)
  } else {
    throw new Error(`Unsupported file type: ${ext}`)
  }

  if (!text.trim()) {
    throw new Error('File is empty or could not be read')
  }

  // Extract recipe with AI
  console.log('[parse-file] Sending to AI, text length:', text.length)
  const extraction = await extractWithAI(text)
  console.log('[parse-file] AI extraction done, title:', extraction.title)

  // Translate if not Hebrew
  const sampleText = [extraction.title, ...extraction.ingredients.slice(0, 3)].join(' ')
  const hebrew = isHebrew(sampleText)
  console.log('[parse-file] isHebrew:', hebrew, '| sample:', sampleText.slice(0, 100))
  if (!hebrew) {
    console.log('[parse-file] Starting translation...')
    const translated = await translateRecipe(extraction)
    console.log('[parse-file] Translation done')
    return translated
  }

  console.log('[parse-file] Returning extraction (no translation needed)')
  return extraction
}
