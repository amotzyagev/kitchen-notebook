import Anthropic from '@anthropic-ai/sdk'

if (typeof window !== 'undefined') {
  throw new Error('AI client must only be used on the server')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
