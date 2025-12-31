import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { 
  createTerminalSession, 
  getTerminalSession, 
  writeToTerminal, 
  resizeTerminal, 
  killTerminalSession,
  subscribeToTerminal,
  listTerminalSessions,
} from '../services/terminal'
import { discoverServers } from '../discovery'
import { logger } from '../utils/logger'

export function createTerminalRoutes() {
  const app = new Hono()

  app.get('/', async (c) => {
    const sessions = listTerminalSessions()
    return c.json(sessions)
  })

  app.post('/create', async (c) => {
    const body = await c.req.json<{ serverId?: string; workdir?: string }>()
    
    let workdir = body.workdir
    
    if (body.serverId && !workdir) {
      const servers = await discoverServers()
      const server = servers.find(s => s.id === body.serverId)
      if (server) {
        workdir = server.workdir
      }
    }
    
    if (!workdir || workdir === 'unknown') {
      workdir = process.env.HOME || '/tmp'
    }

    const sessionId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const session = createTerminalSession(sessionId, workdir)
    
    return c.json({
      id: session.id,
      workdir: session.workdir,
      createdAt: session.createdAt,
    })
  })

  app.get('/:sessionId/stream', async (c) => {
    const sessionId = c.req.param('sessionId')
    const session = getTerminalSession(sessionId)
    
    if (!session) {
      return c.json({ error: 'Terminal session not found' }, 404)
    }

    return streamSSE(c, async (stream) => {
      let closed = false

      const unsubscribe = subscribeToTerminal(sessionId, (data) => {
        if (!closed) {
          const base64Data = Buffer.from(data).toString('base64')
          stream.writeSSE({
            event: 'output',
            data: base64Data,
          })
        }
      })

      if (!unsubscribe) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'Failed to subscribe to terminal' }),
        })
        return
      }

      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ 
          sessionId, 
          workdir: session.workdir,
          message: 'Terminal stream connected' 
        }),
      })

      stream.onAbort(() => {
        closed = true
        unsubscribe()
        logger.debug(`Terminal stream aborted for session ${sessionId}`)
      })

      while (!closed) {
        await new Promise(resolve => setTimeout(resolve, 30000))
        if (!closed) {
          await stream.writeSSE({
            event: 'ping',
            data: JSON.stringify({ timestamp: Date.now() }),
          })
        }
      }
    })
  })

  app.post('/:sessionId/input', async (c) => {
    const sessionId = c.req.param('sessionId')
    const body = await c.req.json<{ data: string }>()
    
    if (!body.data) {
      return c.json({ error: 'No input data provided' }, 400)
    }

    const decodedData = Buffer.from(body.data, 'base64').toString('utf-8')
    const success = writeToTerminal(sessionId, decodedData)
    
    if (!success) {
      return c.json({ error: 'Terminal session not found' }, 404)
    }
    
    return c.json({ success: true })
  })

  app.post('/:sessionId/resize', async (c) => {
    const sessionId = c.req.param('sessionId')
    const body = await c.req.json<{ cols: number; rows: number }>()
    
    if (!body.cols || !body.rows) {
      return c.json({ error: 'cols and rows are required' }, 400)
    }

    const success = resizeTerminal(sessionId, body.cols, body.rows)
    
    if (!success) {
      return c.json({ error: 'Terminal session not found' }, 404)
    }
    
    return c.json({ success: true })
  })

  app.delete('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId')
    const success = killTerminalSession(sessionId)
    
    if (!success) {
      return c.json({ error: 'Terminal session not found' }, 404)
    }
    
    return c.json({ success: true })
  })

  app.get('/:sessionId', async (c) => {
    const sessionId = c.req.param('sessionId')
    const session = getTerminalSession(sessionId)
    
    if (!session) {
      return c.json({ error: 'Terminal session not found' }, 404)
    }
    
    return c.json({
      id: session.id,
      workdir: session.workdir,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      subscriberCount: session.subscribers.size,
    })
  })

  return app
}
