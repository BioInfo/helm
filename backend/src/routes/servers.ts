import { Hono } from 'hono'
import { discoverServers, type OpenCodeServer } from '../discovery'

const app = new Hono()

let cache: { servers: OpenCodeServer[]; timestamp: number } | null = null

app.get('/', async (c) => {
  const now = Date.now()
  if (!cache || now - cache.timestamp > 5000) {
    cache = { servers: await discoverServers(), timestamp: now }
  }
  return c.json(cache.servers)
})

app.post('/refresh', async (c) => {
  cache = { servers: await discoverServers(), timestamp: Date.now() }
  return c.json(cache.servers)
})

app.get('/:id/health', async (c) => {
  const servers = await discoverServers()
  const server = servers.find(s => s.id === c.req.param('id'))
  if (!server) return c.json({ error: 'Not found' }, 404)
  return c.json({ status: server.status })
})

export function createServersRoutes() {
  return app
}
