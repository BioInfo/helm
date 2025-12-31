import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from './utils/logger'

const execAsync = promisify(exec)

export interface OpenCodeServer {
  id: string
  pid: number
  port: number
  mode: 'tui' | 'serve'
  workdir: string
  status: 'healthy' | 'unhealthy'
  projectName?: string
}

export async function discoverServers(): Promise<OpenCodeServer[]> {
  const servers: OpenCodeServer[] = []

  try {
    const { stdout } = await execAsync(
      "lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -i opencode || true"
    )

    if (!stdout.trim()) {
      logger.debug('No OpenCode processes found via lsof')
      return servers
    }

    const lines = stdout.split('\n').filter(Boolean)
    const processedPorts = new Set<number>()

    for (const line of lines) {
      try {
        // lsof format: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
        // Example: opencode 12345 user 10u IPv4 0x... 0t0 TCP *:4096 (LISTEN)
        const parts = line.split(/\s+/)
        if (parts.length < 9) continue

        const pidStr = parts[1]
        if (!pidStr) continue
        const pid = parseInt(pidStr)
        if (isNaN(pid)) continue

        const portMatch = line.match(/:(\d+)\s*\(LISTEN\)/)
        if (!portMatch || !portMatch[1]) continue
        const port = parseInt(portMatch[1])

        if (processedPorts.has(port)) continue
        processedPorts.add(port)

        const workdir = await getProcessWorkdir(pid)
        const mode = await getProcessMode(pid)
        const status = await checkHealth(port)
        const projectName = extractProjectName(workdir)

        servers.push({ id: `${pid}-${port}`, pid, port, mode, workdir, status, projectName })
        logger.debug(`Discovered OpenCode server: PID=${pid}, port=${port}, mode=${mode}, workdir=${workdir}`)
      } catch (lineError) {
        logger.debug('Failed to parse lsof line:', line, lineError)
      }
    }
  } catch (error) {
    logger.error('Discovery failed:', error)
  }

  return servers.sort((a, b) => a.port - b.port)
}

async function getProcessWorkdir(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`lsof -p ${pid} 2>/dev/null | grep cwd || true`)
    const match = stdout.match(/\s(\/\S+)\s*$/)
    if (match?.[1]) return match[1]
  } catch (e) {
    logger.debug(`Failed to get cwd for PID ${pid}:`, e)
  }

  try {
    const { stdout } = await execAsync(`lsof -a -p ${pid} -d cwd 2>/dev/null | tail -1 || true`)
    const match = stdout.match(/\s(\/\S+)\s*$/)
    if (match?.[1]) return match[1]
  } catch (e) {
    logger.debug(`Alternative cwd lookup failed for PID ${pid}:`, e)
  }

  return 'unknown'
}

async function getProcessMode(pid: number): Promise<'tui' | 'serve'> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o tty= 2>/dev/null || true`)
    const tty = stdout.trim()
    return tty && tty !== '?' && tty !== '??' ? 'tui' : 'serve'
  } catch {
    return 'serve'
  }
}

async function checkHealth(port: number): Promise<'healthy' | 'unhealthy'> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(`http://localhost:${port}/session`, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response.ok ? 'healthy' : 'unhealthy'
  } catch {
    return 'unhealthy'
  }
}

function extractProjectName(workdir: string): string | undefined {
  if (workdir === 'unknown') return undefined
  return workdir.split('/').pop() || undefined
}

export async function checkServerHealth(port: number): Promise<boolean> {
  const status = await checkHealth(port)
  return status === 'healthy'
}
