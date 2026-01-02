import { Hono } from 'hono'
import type { Db } from '../db/schema'
import {
  listRemoteServers,
  getRemoteServerById,
  createRemoteServer,
  updateRemoteServer,
  deleteRemoteServer,
} from '../db/queries'
import { logger } from '../utils/logger'

export function createRemoteServersRoutes(db: Db) {
  const app = new Hono()

  app.get('/', (c) => {
    const servers = listRemoteServers(db)
    return c.json(servers)
  })

  app.get('/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ error: 'Invalid server ID' }, 400)
    }
    
    const server = getRemoteServerById(db, id)
    if (!server) {
      return c.json({ error: 'Server not found' }, 404)
    }
    return c.json(server)
  })

  app.post('/', async (c) => {
    try {
      const body = await c.req.json()
      
      if (!body.name || typeof body.name !== 'string') {
        return c.json({ error: 'Name is required' }, 400)
      }
      if (!body.host || typeof body.host !== 'string') {
        return c.json({ error: 'Host is required' }, 400)
      }
      
      const port = body.port ? parseInt(body.port, 10) : 60828
      if (isNaN(port) || port < 1 || port > 65535) {
        return c.json({ error: 'Invalid port number' }, 400)
      }

      const server = createRemoteServer(db, {
        name: body.name.trim(),
        host: body.host.trim(),
        port,
      })
      
      logger.info(`Created remote server: ${server.name} (${server.host}:${server.port})`)
      return c.json(server, 201)
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        return c.json({ error: 'A server with this host and port already exists' }, 409)
      }
      logger.error('Failed to create remote server:', error)
      return c.json({ error: 'Failed to create server' }, 500)
    }
  })

  app.patch('/:id', async (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ error: 'Invalid server ID' }, 400)
    }

    try {
      const body = await c.req.json()
      const updates: { name?: string; host?: string; port?: number; enabled?: boolean } = {}
      
      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return c.json({ error: 'Invalid name' }, 400)
        }
        updates.name = body.name.trim()
      }
      
      if (body.host !== undefined) {
        if (typeof body.host !== 'string' || !body.host.trim()) {
          return c.json({ error: 'Invalid host' }, 400)
        }
        updates.host = body.host.trim()
      }
      
      if (body.port !== undefined) {
        const port = parseInt(body.port, 10)
        if (isNaN(port) || port < 1 || port > 65535) {
          return c.json({ error: 'Invalid port number' }, 400)
        }
        updates.port = port
      }
      
      if (body.enabled !== undefined) {
        updates.enabled = Boolean(body.enabled)
      }

      const server = updateRemoteServer(db, id, updates)
      if (!server) {
        return c.json({ error: 'Server not found' }, 404)
      }
      
      logger.info(`Updated remote server ${id}: ${server.name}`)
      return c.json(server)
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        return c.json({ error: 'A server with this host and port already exists' }, 409)
      }
      logger.error(`Failed to update remote server ${id}:`, error)
      return c.json({ error: 'Failed to update server' }, 500)
    }
  })

  app.delete('/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ error: 'Invalid server ID' }, 400)
    }

    const existing = getRemoteServerById(db, id)
    if (!existing) {
      return c.json({ error: 'Server not found' }, 404)
    }

    deleteRemoteServer(db, id)
    logger.info(`Deleted remote server ${id}: ${existing.name}`)
    return c.json({ success: true })
  })

  app.get('/:id/test', async (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ error: 'Invalid server ID' }, 400)
    }

    const server = getRemoteServerById(db, id)
    if (!server) {
      return c.json({ error: 'Server not found' }, 404)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`http://${server.host}:${server.port}/api/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return c.json({ status: 'healthy', message: 'Connection successful' })
      }
      
      const fallbackResponse = await fetch(`http://${server.host}:${server.port}/session`, {
        signal: AbortSignal.timeout(3000),
      })
      
      if (fallbackResponse.ok || fallbackResponse.status === 401) {
        return c.json({ status: 'healthy', message: 'OpenCode server detected' })
      }
      
      return c.json({ status: 'unhealthy', message: `Server responded with ${response.status}` })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return c.json({ status: 'unhealthy', message: 'Connection timeout' })
      }
      return c.json({ status: 'unhealthy', message: `Connection failed: ${error.message}` })
    }
  })

  return app
}
