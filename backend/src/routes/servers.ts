import { Hono } from 'hono'
import { discoverServers, type OpenCodeServer } from '../discovery'
import { logger } from '../utils/logger'

const app = new Hono()

let cache: { servers: OpenCodeServer[]; timestamp: number } | null = null

async function getServerById(id: string): Promise<OpenCodeServer | null> {
  const now = Date.now()
  if (!cache || now - cache.timestamp > 5000) {
    cache = { servers: await discoverServers(), timestamp: now }
  }
  return cache.servers.find(s => s.id === id) ?? null
}

async function proxyToServer(server: OpenCodeServer, path: string, options?: RequestInit): Promise<Response> {
  const url = `http://127.0.0.1:${server.port}${path}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    logger.error(`Failed to proxy to server ${server.id} at ${url}:`, error)
    throw error
  }
}

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
  const server = await getServerById(c.req.param('id'))
  if (!server) return c.json({ error: 'Not found' }, 404)
  return c.json({ status: server.status })
})

// Get OpenCode config from a specific discovered server
app.get('/:id/config', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  try {
    const response = await proxyToServer(server, '/config')
    if (!response.ok) {
      logger.warn(`Failed to get config from server ${server.id}: ${response.status}`)
      return c.json({ 
        error: 'Failed to fetch config from server',
        status: response.status 
      }, response.status)
    }
    
    const config = await response.json()
    return c.json({
      serverId: server.id,
      projectName: server.projectName,
      workdir: server.workdir,
      config,
    })
  } catch (error) {
    logger.error(`Error fetching config from server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

// Get MCP status from a specific discovered server
app.get('/:id/mcp', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  try {
    const response = await proxyToServer(server, '/mcp')
    if (!response.ok) {
      logger.warn(`Failed to get MCP status from server ${server.id}: ${response.status}`)
      return c.json({ 
        error: 'Failed to fetch MCP status from server',
        status: response.status 
      }, response.status)
    }
    
    const mcpStatus = await response.json()
    return c.json({
      serverId: server.id,
      projectName: server.projectName,
      status: mcpStatus,
    })
  } catch (error) {
    logger.error(`Error fetching MCP status from server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

// Connect/disconnect MCP server on a specific discovered server
app.post('/:id/mcp/:name/connect', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const mcpName = c.req.param('name')
  try {
    const response = await proxyToServer(server, `/mcp/${encodeURIComponent(mcpName)}/connect`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return c.json(error, response.status)
    }
    
    return c.json({ success: true })
  } catch (error) {
    logger.error(`Error connecting MCP ${mcpName} on server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.post('/:id/mcp/:name/disconnect', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const mcpName = c.req.param('name')
  try {
    const response = await proxyToServer(server, `/mcp/${encodeURIComponent(mcpName)}/disconnect`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return c.json(error, response.status)
    }
    
    return c.json({ success: true })
  } catch (error) {
    logger.error(`Error disconnecting MCP ${mcpName} on server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.post('/:id/mcp/:name/auth/authenticate', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const mcpName = c.req.param('name')
  try {
    const response = await proxyToServer(server, `/mcp/${encodeURIComponent(mcpName)}/auth/authenticate`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      return c.json(error, response.status)
    }
    
    return c.json(await response.json())
  } catch (error) {
    logger.error(`Error authenticating MCP ${mcpName} on server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

export function createServersRoutes() {
  return app
}
