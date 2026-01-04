import { Hono } from 'hono'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { ENV } from '@helm/shared/config/env'
import { discoverServers } from '../discovery'
import type { Db } from '../db/schema'
import { listRemoteServers } from '../db/queries'

const TitleRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  sessionID: z.string().min(1)
})

const TITLE_PROMPT = `You are a title generator. You output ONLY a thread title. Nothing else.

Generate a brief title that would help the user find this conversation later.

Rules:
- Single line, ≤50 characters
- Use -ing verbs for actions (Debugging, Implementing, Analyzing)
- Keep exact: technical terms, numbers, filenames
- Remove: the, this, my, a, an
- Never assume tech stack
- If short/conversational input: use titles like "Greeting", "Quick check-in"

Examples:
"debug 500 errors in production" → Debugging production 500 errors
"refactor user service" → Refactoring user service
"why is app.js failing" → Analyzing app.js failure
"hello" → Greeting`

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>
}

function generateSimpleTitle(text: string): string {
  const normalized = text.trim().toLowerCase()
  
  const patterns: Array<{ pattern: RegExp; prefix: string }> = [
    { pattern: /^(how|what|why|when|where|can|could|should|would|is|are|do|does)\b/i, prefix: 'Asking about' },
    { pattern: /\b(fix|debug|error|bug|issue|problem|broken|fail)/i, prefix: 'Debugging' },
    { pattern: /\b(implement|add|create|build|make|write)\b/i, prefix: 'Implementing' },
    { pattern: /\b(refactor|improve|optimize|clean|update)\b/i, prefix: 'Refactoring' },
    { pattern: /\b(test|testing|spec|unit)\b/i, prefix: 'Testing' },
    { pattern: /\b(deploy|production|release|publish)\b/i, prefix: 'Deploying' },
    { pattern: /\b(config|configure|setup|install)\b/i, prefix: 'Configuring' },
  ]
  
  for (const { pattern, prefix } of patterns) {
    if (pattern.test(normalized)) {
      const words = text.split(/\s+/).slice(0, 6).join(' ')
      const title = `${prefix}: ${words}`
      return title.length > 50 ? title.substring(0, 47) + '...' : title
    }
  }
  
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening']
  if (greetings.some(g => normalized.startsWith(g))) {
    return 'Greeting'
  }
  
  const words = text.split(/\s+/).slice(0, 6).join(' ')
  return words.length > 50 ? words.substring(0, 47) + '...' : words
}

async function getAnthropicApiKey(): Promise<string | null> {
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) return envKey
  
  try {
    const serverUrl = `http://127.0.0.1:${ENV.OPENCODE.PORT}`
    const response = await fetch(`${serverUrl}/config`)
    if (response.ok) {
      const config = await response.json() as { providers?: { anthropic?: { apiKey?: string } } }
      if (config.providers?.anthropic?.apiKey) {
        return config.providers.anthropic.apiKey
      }
    }
  } catch {
  }
  
  return null
}

async function generateTitle(text: string): Promise<string> {
  const apiKey = await getAnthropicApiKey()
  
  if (!apiKey) {
    logger.info('No Anthropic API key, using simple title generation')
    return generateSimpleTitle(text)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `${TITLE_PROMPT}\n\nGenerate a title for:\n${text.substring(0, 1000)}`
        }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.warn('Anthropic API error, falling back to simple title', { status: response.status, error })
      return generateSimpleTitle(text)
    }

    const result = await response.json() as AnthropicResponse
    const textContent = result.content.find(c => c.type === 'text')
    if (!textContent?.text) return generateSimpleTitle(text)

    let title = textContent.text
      .replace(/<think>[\s\S]*?<\/think>\s*/g, '')
      .split('\n')
      .map(line => line.trim())
      .find(line => line.length > 0) || ''

    if (title.length > 100) {
      title = title.substring(0, 97) + '...'
    }

    return title || generateSimpleTitle(text)
  } catch (error) {
    logger.warn('Title generation failed, using fallback', error)
    return generateSimpleTitle(text)
  }
}

async function getServerUrl(serverId: string | undefined, directory: string, db: Db): Promise<string | null> {
  if (serverId?.startsWith('remote-')) {
    const remoteId = parseInt(serverId.replace('remote-', ''), 10)
    const remoteServers = listRemoteServers(db)
    const remote = remoteServers.find((s: { id: number }) => s.id === remoteId)
    if (remote) {
      return `http://${remote.host}:${remote.port}`
    }
    return null
  }

  const servers = await discoverServers()
  
  if (serverId) {
    const server = servers.find(s => `${s.pid}-${s.port}` === serverId)
    if (server) {
      return `http://127.0.0.1:${server.port}`
    }
  }
  
  const server = servers.find(s => 
    s.workdir === directory || 
    directory.startsWith(s.workdir + '/') ||
    s.workdir.startsWith(directory + '/')
  )
  
  return server ? `http://127.0.0.1:${server.port}` : null
}

export function createTitleRoutes(db?: Db) {
  const app = new Hono()

  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      const { text, sessionID } = TitleRequestSchema.parse(body)
      const directory = c.req.header('directory') || ''
      const serverId = c.req.header('x-server-id')

      logger.info('Generating session title', { sessionID, textLength: text.length })

      const title = await generateTitle(text)
      
      if (title && db) {
        const serverUrl = await getServerUrl(serverId, directory, db)
        if (serverUrl) {
          try {
            const updateUrl = `${serverUrl}/session/${sessionID}${directory ? `?directory=${encodeURIComponent(directory)}` : ''}`
            const updateResponse = await fetch(updateUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title })
            })
            if (!updateResponse.ok) {
              logger.warn('Failed to update session title on server', { sessionID, serverUrl })
            }
          } catch (err) {
            logger.warn('Error updating session title', err)
          }
        }
      }

      logger.info('Session title generated', { sessionID, title })
      return c.json({ title })

    } catch (error) {
      logger.error('Failed to generate session title:', error)
      return c.json({ error: error instanceof Error ? error.message : 'Failed to generate title' }, 500)
    }
  })

  return app
}
