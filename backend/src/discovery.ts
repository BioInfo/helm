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
  mode: 'tui' | 'serve' | 'terminal-only'
  workdir: string
  projectName: string
  status: 'healthy' | 'unhealthy' | 'terminal-only'
  cliType?: 'opencode' | 'claude'
  isRemote?: boolean
  remoteHost?: string
  startTime?: string
}

export async function discoverServers(): Promise<OpenCodeServer[]> {
  try {
    const { stdout } = await execAsync(
      "lsof -iTCP -sTCP:LISTEN -n -P | grep -E \"opencode|claude\" || true"
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

        // Parse process name and detect CLI type
        const processName = parts[0]
        if (!processName) continue

        // Filter out Chrome processes (claude-in-chrome MCP server)
        if (processName.toLowerCase().includes('chrome')) continue

        // Detect CLI type from process name
        let cliType: 'opencode' | 'claude' = 'opencode' // Default
        if (processName.toLowerCase().includes('claude')) {
          cliType = 'claude'
        } else if (processName.toLowerCase().includes('opencode')) {
          cliType = 'opencode'
        }

        const pidStr = parts[1]
        if (!pidStr) continue
        const pid = parseInt(pidStr, 10)
        
        const address = parts[parts.length - 2]
        if (!address) continue
        const portMatch = address.match(/:(\d+)$/)
        
        if (!portMatch || !portMatch[1]) continue
        
        const port = parseInt(portMatch[1], 10)
        
        if (port === parseInt(process.env.PORT || '5001', 10)) continue
        if (port === HELM_INTERNAL_PORT) continue

        let workdir = 'unknown'
        try {
          const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} -a -d cwd -F n 2>/dev/null`)
          const lines = cwdOut.split('\n')
          for (const line of lines) {
            if (line.startsWith('n/')) {
              workdir = line.slice(1)
              break
            }
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
          } catch { /* fallback health check may fail */ }
        
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
        } catch { /* tty detection may fail */ }
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
          cliType,
        })
      } catch (err) {
        logger.warn(`Error parsing discovery line: ${line}`, err)
      }
    }

    // Discover TUI-only Claude Code processes (no HTTP endpoint)
    try {
      const { stdout: psOut } = await execAsync("ps -eo pid,lstart,tty,command | grep 'claude ' | grep -v grep || true")
      if (psOut.trim()) {
        const psLines = psOut.split('\n').filter(Boolean)

        for (const line of psLines) {
          try {
            // Parse: PID LSTART TTY COMMAND
            // Example: 89112 Sat Jan 19 05:38:06 2026 s001 ssh -t pi ~/.local/bin/claude
            // or:      50369 Sat Jan 19 06:55:08 2026 s001 claude --dangerously-skip-permissions
            const pidMatch = line.match(/^\s*(\d+)\s+(.+?)\s+(\d{4})\s+(\S+)\s+(.+)$/)
            if (!pidMatch || !pidMatch[1] || !pidMatch[2] || !pidMatch[3] || !pidMatch[4] || !pidMatch[5]) continue

            const pid = parseInt(pidMatch[1], 10)
            const startTimeStr = `${pidMatch[2]} ${pidMatch[3]}` // "Sat Jan 19 05:38:06 2026"
            const tty = pidMatch[4]
            const command = pidMatch[5]

            // Skip if we already found this PID via HTTP port discovery
            if (servers.some(s => s.pid === pid)) continue

            // Skip Claude-in-Chrome MCP processes
            if (command.includes('--claude-in-chrome-mcp')) continue

            // Skip orphaned background processes (no terminal)
            // These are processes from closed terminals that keep running
            if (tty === '??' || tty === '?') continue

            // Detect if this is an SSH session
            let isRemote = false
            let remoteHost = ''
            let projectName = 'Claude Session'

            if (command.includes('ssh')) {
              isRemote = true
              // Extract hostname from SSH command: "ssh -t pi ~/.local/bin/claude"
              const sshMatch = command.match(/ssh\s+(?:-\S+\s+)*([^\s]+)/)
              if (sshMatch && sshMatch[1]) {
                remoteHost = sshMatch[1]
                // Add TTY to differentiate multiple SSH sessions to same host
                projectName = `${remoteHost} (${tty})`
              }
            }

            // Get working directory
            let workdir = 'unknown'
            try {
              const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} -a -d cwd -F n 2>/dev/null`)
              const cwdLines = cwdOut.split('\n')
              for (const cwdLine of cwdLines) {
                if (cwdLine.startsWith('n/')) {
                  workdir = cwdLine.slice(1)
                  break
                }
              }
            } catch (err) {
              logger.warn(`Failed to get cwd for Claude TUI pid ${pid}`, err)
            }

            // Format start time (HH:MM)
            const startTime = new Date(startTimeStr).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })

            // For local sessions, create a more descriptive name
            if (!isRemote && workdir !== 'unknown') {
              const baseName = path.basename(workdir)
              // Add terminal identifier to differentiate multiple sessions in same directory
              projectName = `${baseName} (${tty})`
            }

            servers.push({
              id: `claude-tui-${pid}`,
              pid,
              port: 0, // No HTTP endpoint
              mode: 'terminal-only',
              workdir: workdir !== 'unknown' ? workdir : '/unknown',
              projectName,
              status: 'terminal-only',
              cliType: 'claude',
              isRemote,
              remoteHost: remoteHost || undefined,
              startTime,
            })
          } catch (err) {
            logger.warn(`Error parsing Claude TUI process: ${line}`, err)
          }
        }
      }
    } catch (err) {
      logger.warn('Claude TUI discovery failed:', err)
      // Continue anyway, this is optional discovery
    }

    return servers
  } catch (err) {
    logger.error('Server discovery failed:', err)
    return []
  }
}
