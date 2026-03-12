import Anthropic from '@anthropic-ai/sdk'

if (typeof window !== 'undefined') {
  throw new Error('AI client must only be used on the server')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL_SONNET = 'claude-sonnet-4-6'
export const MODEL_SONNET_DATED = 'claude-sonnet-4-20250514'
export const MODEL_HAIKU = 'claude-haiku-4-5-20251001'
export const AI_MAX_TOKENS = 4096

export const TAGS_DESCRIPTION = 'Category tags for the recipe in Hebrew (e.g., קינוח, אפייה, מאפים, סלט, מרק, בשרי, צמחוני, טבעוני, ארוחת בוקר). For desserts (קינוח), do not tag צמחוני - use טבעוני if applicable. צמחוני is only relevant for non-dessert recipes.'
