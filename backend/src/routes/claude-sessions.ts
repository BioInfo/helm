import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { discoverClaudeSessions, readClaudeSessionMessages } from '../claude-sessions'
import type { ClaudeProject } from '../claude-sessions'
import { claudeSessionsWatcher } from '../claude-sessions-watcher'
import type { SessionChangeEvent } from '../claude-sessions-watcher'
import { logger } from '../utils/logger'

const app = new Hono()

// Format sessions for API response
function formatSessionsForResponse(projects: ClaudeProject[]) {
  const allSessions = projects.flatMap(project =>
    project.sessions.map(session => ({
      ...session,
      id: session.sessionId,
      title: session.firstPrompt,
      directory: session.projectPath,
      createdAt: new Date(session.created).getTime(),
      updatedAt: new Date(session.modified).getTime(),
    }))
  )
  allSessions.sort((a, b) => b.updatedAt - a.updatedAt)
  return allSessions
}

// Get all Claude sessions across all projects (REST endpoint for backward compatibility)
app.get('/all', async (c) => {
  try {
    const projects = await discoverClaudeSessions()
    const allSessions = formatSessionsForResponse(projects)
    return c.json(allSessions)
  } catch (err) {
    logger.error('Failed to fetch Claude sessions:', err)
    return c.json({ error: 'Failed to fetch sessions' }, 500)
  }
})

// Real-time SSE endpoint for session updates
app.get('/stream', async (c) => {
  logger.info('New SSE connection established for Claude sessions')

  return streamSSE(c, async (stream) => {
    let isConnected = true

    // Send initial data
    try {
      const projects = await claudeSessionsWatcher.getCurrentSessions()
      const allSessions = formatSessionsForResponse(projects)

      await stream.writeSSE({
        event: 'init',
        data: JSON.stringify({
          type: 'init',
          sessions: allSessions,
          timestamp: Date.now()
        })
      })
    } catch (err) {
      logger.error('Error sending initial SSE data:', err)
    }

    // Listen for session changes
    const handleSessionChange = async (event: SessionChangeEvent) => {
      if (!isConnected) return

      try {
        const allSessions = formatSessionsForResponse(event.projects)

        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify({
            type: event.type,
            sessions: allSessions,
            timestamp: event.timestamp
          })
        })
      } catch (err) {
        logger.error('Error sending SSE update:', err)
        isConnected = false
      }
    }

    claudeSessionsWatcher.addListener(handleSessionChange)

    // Send keepalive every 30 seconds
    const keepaliveInterval = setInterval(async () => {
      if (!isConnected) {
        clearInterval(keepaliveInterval)
        return
      }

      try {
        await stream.writeSSE({
          event: 'keepalive',
          data: JSON.stringify({ timestamp: Date.now() })
        })
      } catch (err) {
        logger.warn('Keepalive failed, connection likely closed')
        isConnected = false
        clearInterval(keepaliveInterval)
      }
    }, 30000)

    // Cleanup on disconnect
    c.req.raw.signal.addEventListener('abort', () => {
      logger.info('SSE connection closed')
      isConnected = false
      claudeSessionsWatcher.removeListener(handleSessionChange)
      clearInterval(keepaliveInterval)
    })
  })
})

// Get sessions for a specific project
app.get('/project/:projectPath', async (c) => {
  try {
    const projectPath = decodeURIComponent(c.req.param('projectPath'))
    const projects = await discoverClaudeSessions()
    const project = projects.find(p => p.projectPath === projectPath)

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    const sessions = project.sessions.map(session => ({
      ...session,
      id: session.sessionId,
      title: session.firstPrompt,
      directory: session.projectPath,
      createdAt: new Date(session.created).getTime(),
      updatedAt: new Date(session.modified).getTime(),
    }))

    return c.json(sessions)
  } catch (err) {
    console.error('Failed to fetch project sessions:', err)
    return c.json({ error: 'Failed to fetch sessions' }, 500)
  }
})

// Get messages for a specific session
app.get('/session/:sessionId/messages', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    const projectPath = c.req.query('projectPath')

    if (!projectPath) {
      return c.json({ error: 'projectPath required' }, 400)
    }

    const messages = await readClaudeSessionMessages(projectPath, sessionId)
    return c.json(messages)
  } catch (err) {
    console.error('Failed to fetch session messages:', err)
    return c.json({ error: 'Failed to fetch messages' }, 500)
  }
})

export default app
