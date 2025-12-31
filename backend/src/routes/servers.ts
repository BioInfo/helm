import { Hono } from 'hono'
import { discoverServers, checkServerHealth, type OpenCodeServer } from '../discovery'
import { logger } from '../utils/logger'

const CACHE_TTL_MS = 5000

interface ServerCache {
  servers: OpenCodeServer[]
  timestamp: number
}

let cache: ServerCache | null = null

export function createServersRoutes() {
  const app = new Hono()

  app.get('/', async (c) => {
    const now = Date.now()
    
    if (cache && (now - cache.timestamp) < CACHE_TTL_MS) {
      logger.debug('Returning cached server list')
      return c.json(cache.servers)
    }

    const servers = await discoverServers()
    cache = { servers, timestamp: now }
    return c.json(servers)
  })

  app.post('/refresh', async (c) => {
    const servers = await discoverServers()
    cache = { servers, timestamp: Date.now() }
    return c.json(servers)
  })

  app.get('/:id', async (c) => {
    const id = c.req.param('id')
    const servers = cache?.servers ?? await discoverServers()
    const server = servers.find(s => s.id === id)
    
    if (!server) {
      return c.json({ error: 'Server not found' }, 404)
    }
    
    return c.json(server)
  })

  app.get('/:id/health', async (c) => {
    const id = c.req.param('id')
    const servers = cache?.servers ?? await discoverServers()
    const server = servers.find(s => s.id === id)
    
    if (!server) {
      return c.json({ error: 'Server not found' }, 404)
    }

    const healthy = await checkServerHealth(server.port)
    return c.json({ 
      id: server.id,
      port: server.port,
      status: healthy ? 'healthy' : 'unhealthy' 
    })
  })

  return app
}
