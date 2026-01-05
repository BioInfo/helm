import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { discoverServers, type OpenCodeServer } from '../discovery'
import type { Db } from '../db/schema'
import { listEnabledRemoteServers, updateRemoteServerLastSeen } from '../db/queries'
import { logger } from '../utils/logger'

let db: Db | null = null
let cache: { servers: OpenCodeServer[]; timestamp: number } | null = null

export function setServersDb(database: Db) {
  db = database
}

async function discoverAllServers(): Promise<OpenCodeServer[]> {
  const localServers = await discoverServers()
  
  if (!db) {
    return localServers
  }
  
  const remoteConfigs = listEnabledRemoteServers(db)
  const remoteServers: OpenCodeServer[] = []
  
  for (const config of remoteConfigs) {
    let status: 'healthy' | 'unhealthy' = 'unhealthy'
    let workdir = 'unknown'
    let projectName = config.name
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const sessionResponse = await fetch(`http://${config.host}:${config.port}/session`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (sessionResponse.ok) {
        status = 'healthy'
        updateRemoteServerLastSeen(db, config.id)
        
        const sessions = await sessionResponse.json()
        if (Array.isArray(sessions) && sessions.length > 0) {
          const sessionWithDir = sessions.find((s: { directory?: string }) => s.directory && s.directory !== 'unknown')
          workdir = sessionWithDir?.directory || sessions[0].directory || 'unknown'
          if (workdir && workdir !== 'unknown') {
            const pathParts = workdir.split('/')
            projectName = `${config.name} (${pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]})`
          }
        }
      }
    } catch {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const healthResponse = await fetch(`http://${config.host}:${config.port}/api/health`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        
        if (healthResponse.ok) {
          status = 'healthy'
          updateRemoteServerLastSeen(db, config.id)
        }
      } catch { /* remote server may be unreachable */ }
    }
    
    remoteServers.push({
      id: `remote-${config.id}`,
      pid: 0,
      port: config.port,
      mode: 'serve',
      workdir,
      projectName,
      status,
      isRemote: true,
      remoteHost: config.host,
    })
  }
  
  return [...localServers, ...remoteServers]
}

async function getServerById(id: string): Promise<OpenCodeServer | null> {
  const now = Date.now()
  if (!cache || now - cache.timestamp > 5000) {
    cache = { servers: await discoverAllServers(), timestamp: now }
  }
  return cache.servers.find(s => s.id === id) ?? null
}

async function proxyToServer(server: OpenCodeServer, path: string, options?: RequestInit): Promise<Response> {
  const host = server.isRemote && server.remoteHost ? server.remoteHost : '127.0.0.1'
  const url = `http://${host}:${server.port}${path}`
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

const app = new Hono()

app.get('/', async (c) => {
  const now = Date.now()
  if (!cache || now - cache.timestamp > 5000) {
    cache = { servers: await discoverAllServers(), timestamp: now }
  }
  return c.json(cache.servers)
})

app.post('/refresh', async (c) => {
  cache = { servers: await discoverAllServers(), timestamp: Date.now() }
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
      }, response.status as ContentfulStatusCode)
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
      }, response.status as ContentfulStatusCode)
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
      return c.json(error, response.status as ContentfulStatusCode)
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
      return c.json(error, response.status as ContentfulStatusCode)
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
      return c.json(error, response.status as ContentfulStatusCode)
    }
    
    return c.json(await response.json())
  } catch (error) {
    logger.error(`Error authenticating MCP ${mcpName} on server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.get('/:id/files', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const filePath = c.req.query('path') || '/'
  
  try {
    const response = await proxyToServer(server, `/file?path=${encodeURIComponent(filePath)}`)
    
    if (!response.ok) {
      logger.warn(`Failed to get files from server ${server.id}: ${response.status}`)
      return c.json({ 
        error: 'Failed to fetch files from server',
        status: response.status 
      }, response.status as ContentfulStatusCode)
    }
    
    const files = await response.json() as OpenCodeFile[]
    
    const transformedFiles = transformOpenCodeFilesToHelmFormat(files, filePath, server.workdir)
    return c.json(transformedFiles)
  } catch (error) {
    logger.error(`Error fetching files from server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.get('/:id/files/*', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const pathParam = c.req.path.replace(/^\/api\/servers\/[^/]+\/files\/?/, '')
  const filePath = decodeURIComponent(pathParam) || '/'
  
  try {
    const listResponse = await proxyToServer(server, `/file?path=${encodeURIComponent(filePath)}`)
    
    if (!listResponse.ok) {
      logger.warn(`Failed to get file from server ${server.id}: ${listResponse.status}`)
      return c.json({ 
        error: 'Failed to fetch file from server',
        status: listResponse.status 
      }, listResponse.status as ContentfulStatusCode)
    }
    
    const data = await listResponse.json() as OpenCodeFile[]
    
    if (Array.isArray(data) && data.length > 0) {
      const transformedFiles = transformOpenCodeFilesToHelmFormat(data, filePath, server.workdir)
      return c.json(transformedFiles)
    }
    
    if (Array.isArray(data) && data.length === 0) {
      const contentResponse = await proxyToServer(server, `/file/content?path=${encodeURIComponent(filePath)}`)
      
      if (contentResponse.ok) {
        const contentData = await contentResponse.json() as { type: string; content: string }
        const fileName = filePath.split('/').pop() || filePath
        return c.json({
          name: fileName,
          path: filePath,
          isDirectory: false,
          size: contentData.content?.length || 0,
          content: contentData.content ? Buffer.from(contentData.content).toString('base64') : undefined,
          mimeType: 'text/plain',
          lastModified: new Date(),
        })
      }
    }
    
    return c.json({ error: 'File not found' }, 404)
  } catch (error) {
    logger.error(`Error fetching file from server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

interface OpenCodeFile {
  name: string
  path: string
  absolute: string
  type: 'file' | 'directory'
  ignored: boolean
  content?: string
  size?: number
}

function transformOpenCodeFilesToHelmFormat(
  files: OpenCodeFile[], 
  currentPath: string,
  workspaceRoot: string
) {
  const children = files.map(file => ({
    name: file.name,
    path: file.path,
    isDirectory: file.type === 'directory',
    size: file.size || 0,
    lastModified: new Date(),
  }))
  
  return {
    name: currentPath === '/' ? 'root' : currentPath.split('/').pop() || 'root',
    path: currentPath,
    isDirectory: true,
    size: 0,
    children: children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    }),
    lastModified: new Date(),
    workspaceRoot,
  }
}

function transformOpenCodeFileToHelmFormat(file: OpenCodeFile, requestedPath: string) {
  return {
    name: file.name,
    path: requestedPath,
    isDirectory: file.type === 'directory',
    size: file.size || 0,
    content: file.content,
    lastModified: new Date(),
  }
}

app.get('/:id/event', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const host = server.isRemote && server.remoteHost ? server.remoteHost : '127.0.0.1'
  const directory = c.req.query('directory')
  const targetUrl = new URL(`http://${host}:${server.port}/event`)
  if (directory) {
    targetUrl.searchParams.set('directory', directory)
  }
  
  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
    
    if (!response.ok || !response.body) {
      return c.json({ error: 'Failed to connect to event stream' }, 502)
    }
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    logger.error(`Error proxying event stream from server ${server.id}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.all('/:id/proxy/*', async (c) => {
  const server = await getServerById(c.req.param('id'))
  if (!server) {
    return c.json({ error: 'Server not found' }, 404)
  }
  
  const host = server.isRemote && server.remoteHost ? server.remoteHost : '127.0.0.1'
  const proxyPath = '/' + c.req.path.replace(/^\/api\/servers\/[^/]+\/proxy\/?/, '')
  const queryString = new URL(c.req.url).search
  const targetUrl = `http://${host}:${server.port}${proxyPath}${queryString}`
  
  try {
    const headers: Record<string, string> = {}
    const contentType = c.req.header('content-type')
    if (contentType) {
      headers['Content-Type'] = contentType
    }
    
    let body: string | undefined
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      try {
        body = await c.req.text()
      } catch {
        body = undefined
      }
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    
    const responseHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
    }
    
    const respContentType = response.headers.get('content-type')
    if (respContentType) {
      responseHeaders['Content-Type'] = respContentType
    }
    
    if (respContentType?.includes('text/event-stream')) {
      responseHeaders['Cache-Control'] = 'no-cache'
      responseHeaders['Connection'] = 'keep-alive'
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      })
    }
    
    const responseBody = await response.text()
    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    logger.error(`Error proxying to server ${server.id} at ${targetUrl}:`, error)
    return c.json({ error: 'Failed to connect to server' }, 502)
  }
})

app.options('/:id/proxy/*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
})

app.options('/:id/event', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  })
})

export function createServersRoutes(database?: Db) {
  if (database) {
    setServersDb(database)
  }
  return app
}
