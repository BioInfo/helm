import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import { logger } from './utils/logger'

const execAsync = promisify(exec)

const HELM_INTERNAL_PORT = parseInt(process.env.OPENCODE_SERVER_PORT || '5551', 10)

export interface OpenCodeServer {
  id: string
  pid: number
  port: number
  mode: 'tui' | 'serve'
  workdir: string
  projectName: string
  status: 'healthy' | 'unhealthy'
}

export async function discoverServers(): Promise<OpenCodeServer[]> {
  try {
    const { stdout } = await execAsync(
      "lsof -iTCP -sTCP:LISTEN -n -P | grep opencode || true"
    )
    
    if (!stdout.trim()) {
      return []
    }
    
    const servers: OpenCodeServer[] = []
    const lines = stdout.split('\n').filter(Boolean)
    
    for (const line of lines) {
      try {
        const parts = line.split(/\s+/)
        if (parts.length < 9) continue
        
        const pid = parseInt(parts[1], 10)
        // Address is second-to-last (last is "(LISTEN)")
        const address = parts[parts.length - 2]
        const portMatch = address.match(/:(\d+)$/)
        
        if (!portMatch) continue
        
        const port = parseInt(portMatch[1], 10)
        
        if (port === parseInt(process.env.PORT || '5001', 10)) continue
        if (port === HELM_INTERNAL_PORT) continue

        let workdir = 'unknown'
        try {
          const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} | grep " cwd " | awk '{print $9}'`)
          const possiblePath = cwdOut.trim()
          if (possiblePath && possiblePath.startsWith('/')) {
            workdir = possiblePath
          }
        } catch (err) {
          logger.warn(`Failed to get cwd for pid ${pid}`, err)
        }
        
        let mode: 'tui' | 'serve' = 'serve'
        try {
          const { stdout: ttyOut } = await execAsync(`ps -p ${pid} -o tty=`)
          const tty = ttyOut.trim()
          if (tty && tty !== '?' && tty !== '??') {
            mode = 'tui'
          }
        } catch {}
        
        let status: 'healthy' | 'unhealthy' = 'unhealthy'
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2000)
          
          const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          status = response.ok ? 'healthy' : 'unhealthy'
        } catch {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2000)
            
            const response = await fetch(`http://127.0.0.1:${port}/session`, {
                signal: controller.signal
            })
            clearTimeout(timeoutId)
            if (response.ok || response.status === 401) {
                status = 'healthy'
            }
          } catch {}
        }
        
        const projectName = workdir !== 'unknown' ? path.basename(workdir) : 'Unknown Project'
        
        servers.push({
          id: `${pid}-${port}`,
          pid,
          port,
          mode,
          workdir,
          projectName,
          status,
        })
      } catch (err) {
        logger.warn(`Error parsing discovery line: ${line}`, err)
      }
    }
    
    return servers
  } catch (err) {
    logger.error('Server discovery failed:', err)
    return []
  }
}
