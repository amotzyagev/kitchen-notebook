import Anthropic from '@anthropic-ai/sdk'

if (typeof window !== 'undefined') {
  throw new Error('AI client must only be used on the server')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const TAGS_DESCRIPTION = 'Category tags for the recipe in Hebrew (e.g., קינוח, אפייה, מאפים, סלט, מרק, בשרי, צמחוני, טבעוני, ארוחת בוקר). For desserts (קינוח), do not tag צמחוני - use טבעוני if applicable. צמחוני is only relevant for non-dessert recipes.'
