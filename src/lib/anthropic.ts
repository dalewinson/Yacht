import Anthropic from '@anthropic-ai/sdk'

export function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

export const ASK_MODEL = 'claude-opus-4-8'
