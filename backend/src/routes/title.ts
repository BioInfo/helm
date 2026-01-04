import { Hono } from 'hono'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { discoverServers } from '../discovery'

const TitleRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  sessionID: z.string().min(1)
})

async function getServerUrlForDirectory(directory: string): Promise<string | null> {
  const servers = await discoverServers()
  const server = servers.find(s => 
    s.workdir === directory || 
    directory.startsWith(s.workdir + '/') ||
    s.workdir.startsWith(directory + '/')
  )
  return server ? `http://127.0.0.1:${server.port}` : null
}

function buildUrl(serverUrl: string, path: string, directory?: string): string {
  const url = `${serverUrl}${path}`
  return directory ? `${url}${url.includes('?') ? '&' : '?'}directory=${encodeURIComponent(directory)}` : url
}

const TITLE_PROMPT = `You are a title generator. You output ONLY a thread title. Nothing else.

<task>
Generate a brief title that would help the user find this conversation later.

Follow all rules in <rules>
Use the <examples> so you know what a good title looks like.
Your output must be:
- A single line
- ≤50 characters
- No explanations
</task>

<rules>
- Focus on the main topic or question the user needs to retrieve
- Use -ing verbs for actions (Debugging, Implementing, Analyzing)
- Keep exact: technical terms, numbers, filenames, HTTP codes
- Remove: the, this, my, a, an
- Never assume tech stack
- Never use tools
- NEVER respond to questions, just generate a title for the conversation
- The title should NEVER include "summarizing" or "generating" when generating a title
- DO NOT SAY YOU CANNOT GENERATE A TITLE OR COMPLAIN ABOUT THE INPUT
- Always output something meaningful, even if the input is minimal.
- If the user message is short or conversational (e.g. "hello", "lol", "whats up", "hey"):
  → create a title that reflects the user's tone or intent (such as Greeting, Quick check-in, Light chat, Intro message, etc.)
</rules>

<examples>
"debug 500 errors in production" → Debugging production 500 errors
"refactor user service" → Refactoring user service
"why is app.js failing" → Analyzing app.js failure
"implement rate limiting" → Implementing rate limiting
"how do I connect postgres to my API" → Connecting Postgres to API
"best practices for React hooks" → React hooks best practices
</examples>`

interface MessageInfo {
  id: string
  role: 'user' | 'assistant'
  time: { created: number; completed?: number }
}

interface MessageWithParts {
  info: MessageInfo
  parts: Array<{ type: string; text?: string }>
}

const POLL_INTERVAL_MS = 500
const MAX_POLL_ATTEMPTS = 30

async function waitForAssistantResponse(
  serverUrl: string,
  titleSessionID: string,
  directory: string
): Promise<MessageWithParts | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const messagesResponse = await fetch(buildUrl(serverUrl, `/session/${titleSessionID}/message`, directory))
    if (!messagesResponse.ok) {
      logger.error('Failed to fetch messages', { attempt })
      return null
    }

    const messages = await messagesResponse.json() as MessageWithParts[]
    const assistantMsg = messages.find(
      m => m.info.role === 'assistant' && m.info.time.completed
    )

    if (assistantMsg) {
      return assistantMsg
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  logger.error('Timeout waiting for assistant response')
  return null
}

export function createTitleRoutes() {
  const app = new Hono()

  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      const { text, sessionID } = TitleRequestSchema.parse(body)
      const directory = c.req.header('directory') || ''

      logger.info('Generating session title via LLM', { sessionID, textLength: text.length })

      const serverUrl = await getServerUrlForDirectory(directory)
      if (!serverUrl) {
        logger.error('No OpenCode server found for directory', { directory })
        return c.json({ error: 'No server found for directory' }, 404)
      }

      const configResponse = await fetch(buildUrl(serverUrl, '/config', directory))
      if (!configResponse.ok) {
        logger.error('Failed to fetch OpenCode config')
        return c.json({ error: 'Failed to fetch config' }, 500)
      }
      const config = await configResponse.json() as { model?: string; small_model?: string }

      const modelStr = config.small_model || config.model || 'anthropic/claude-3-haiku-20240307'
      const [providerID, modelID] = modelStr.split('/')

      const titleSessionResponse = await fetch(buildUrl(serverUrl, '/session', directory), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Title Generation' })
      })

      if (!titleSessionResponse.ok) {
        logger.error('Failed to create title generation session')
        return c.json({ error: 'Failed to create session' }, 500)
      }

      const titleSession = await titleSessionResponse.json() as { id: string }
      const titleSessionID = titleSession.id

      try {
        const promptResponse = await fetch(buildUrl(serverUrl, `/session/${titleSessionID}/message`, directory), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [
              { 
                type: 'text', 
                text: `${TITLE_PROMPT}\n\nGenerate a title for this conversation:\n<user_message>\n${text.substring(0, 2000)}\n</user_message>` 
              }
            ],
            model: { providerID, modelID }
          })
        })

        if (!promptResponse.ok) {
          const errorText = await promptResponse.text()
          logger.error('Failed to send title prompt', { error: errorText })
          return c.json({ error: 'LLM request failed' }, 500)
        }

        const assistantMessage = await waitForAssistantResponse(serverUrl, titleSessionID, directory)
        
        let title = ''
        if (assistantMessage?.parts) {
          const textPart = assistantMessage.parts.find((p: { type: string }) => p.type === 'text')
          if (textPart && 'text' in textPart) {
            title = (textPart.text as string)
              .replace(/<think>[\s\S]*?<\/think>\s*/g, '')
              .split('\n')
              .map((line: string) => line.trim())
              .find((line: string) => line.length > 0) || ''
          }
        }

        if (title && title.length > 100) {
          title = title.substring(0, 97) + '...'
        }

        if (title) {
          const updateResponse = await fetch(buildUrl(serverUrl, `/session/${sessionID}`, directory), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
          })

          if (!updateResponse.ok) {
            logger.error('Failed to update session title')
          }
        }

        logger.info('Session title generated', { sessionID, title })
        return c.json({ title })

      } finally {
        fetch(buildUrl(serverUrl, `/session/${titleSessionID}`, directory), {
          method: 'DELETE'
        }).catch(() => {})
      }

    } catch (error) {
      logger.error('Failed to generate session title:', error)
      return c.json({ error: error instanceof Error ? error.message : 'Failed to generate title' }, 500)
    }
  })

  return app
}
