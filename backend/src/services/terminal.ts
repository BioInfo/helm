import * as pty from 'node-pty'
import * as fs from 'fs'
import * as os from 'os'
import { logger } from '../utils/logger'

export interface TerminalSession {
  id: string
  pty: pty.IPty
  workdir: string
  createdAt: number
  lastActivity: number
  subscribers: Set<(data: string) => void>
  outputBuffer: string[]
  hasHadSubscriber: boolean
  alive: boolean
}

const sessions = new Map<string, TerminalSession>()

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000
const MAX_BUFFER_SIZE = 50000 // characters

function getShell(): string {
  // Prefer user's configured shell first
  if (process.env.SHELL) {
    try {
      fs.accessSync(process.env.SHELL, fs.constants.X_OK)
      logger.info(`[Terminal] Using user shell: ${process.env.SHELL}`)
      return process.env.SHELL
    } catch {
      // Fall through to defaults
    }
  }
  
  // Try shells in order of preference (zsh first for macOS)
  const shells = ['/bin/zsh', '/bin/bash', '/bin/sh', '/usr/bin/zsh', '/usr/bin/bash', '/usr/bin/sh']
  
  for (const shell of shells) {
    try {
      fs.accessSync(shell, fs.constants.X_OK)
      logger.info(`[Terminal] Found shell: ${shell}`)
      return shell
    } catch {
      // Try next shell
    }
  }
  
  return '/bin/sh'
}

function getEnvironment(workdir: string): Record<string, string> {
  const homeDir = process.env.HOME || os.homedir() || '/tmp'
  
  return {
    // Essential
    HOME: homeDir,
    USER: process.env.USER || 'node',
    SHELL: getShell(),
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    
    // Path
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    
    // Working directory
    PWD: workdir,
    
    // Locale
    LANG: process.env.LANG || 'en_US.UTF-8',
    LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
    
    // Terminal settings
    LINES: '24',
    COLUMNS: '80',
    
    // Disable features that might cause issues
    HISTFILE: '',
    HISTSIZE: '1000',
  }
}

export function createTerminalSession(sessionId: string, workdir: string): TerminalSession {
  // Return existing session if it exists and is alive
  const existing = sessions.get(sessionId)
  if (existing && existing.alive) {
    existing.lastActivity = Date.now()
    logger.info(`[Terminal] Returning existing session ${sessionId}`)
    return existing
  }
  
  // Clean up dead session if exists
  if (existing) {
    sessions.delete(sessionId)
  }

  const shell = getShell()
  
  // Validate workdir
  let validWorkdir = workdir
  try {
    fs.accessSync(workdir, fs.constants.R_OK | fs.constants.X_OK)
  } catch {
    logger.warn(`[Terminal] Workdir ${workdir} not accessible, using /tmp`)
    validWorkdir = '/tmp'
  }
  
  logger.info(`[Terminal] Creating session ${sessionId}`)
  logger.info(`[Terminal] Shell: ${shell}`)
  logger.info(`[Terminal] Workdir: ${validWorkdir}`)
  
  const env = getEnvironment(validWorkdir)
  
  // Create PTY with login shell (no -i flag which requires tty)
  // Use -l for login shell which sources profiles properly
  let ptyProcess: pty.IPty
  
  try {
    ptyProcess = pty.spawn(shell, ['-l'], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: validWorkdir,
      env,
    })
    logger.info(`[Terminal] PTY spawned, pid: ${ptyProcess.pid}`)
  } catch (err) {
    logger.error(`[Terminal] Failed to spawn PTY with -l, trying without args:`, err)
    
    // Fallback: try without any args
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: validWorkdir,
        env,
      })
      logger.info(`[Terminal] PTY spawned (fallback), pid: ${ptyProcess.pid}`)
    } catch (err2) {
      logger.error(`[Terminal] Failed to spawn PTY entirely:`, err2)
      throw new Error(`Failed to create terminal: ${err2}`)
    }
  }

  const session: TerminalSession = {
    id: sessionId,
    pty: ptyProcess,
    workdir: validWorkdir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    subscribers: new Set(),
    outputBuffer: [],
    hasHadSubscriber: false,
    alive: true,
  }

  // Handle data from PTY
  ptyProcess.onData((data) => {
    if (!session.alive) return
    
    session.lastActivity = Date.now()
    
    // Buffer if no subscribers yet
    if (session.subscribers.size === 0) {
      session.outputBuffer.push(data)
      
      // Trim buffer if too large
      const totalSize = session.outputBuffer.reduce((sum, s) => sum + s.length, 0)
      while (totalSize > MAX_BUFFER_SIZE && session.outputBuffer.length > 1) {
        session.outputBuffer.shift()
      }
      return
    }
    
    // Send to all subscribers
    for (const subscriber of session.subscribers) {
      try {
        subscriber(data)
      } catch (err) {
        logger.error(`[Terminal] Failed to send to subscriber:`, err)
      }
    }
  })

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode, signal }) => {
    logger.info(`[Terminal] Session ${sessionId} exited: code=${exitCode}, signal=${signal}`)
    session.alive = false
    
    // Notify subscribers of exit
    const exitMessage = `\r\n[Process exited with code ${exitCode}${signal ? `, signal ${signal}` : ''}]\r\n`
    for (const subscriber of session.subscribers) {
      try {
        subscriber(exitMessage)
      } catch {
        // Ignore errors on exit notification
      }
    }
    
    // Clear subscribers after notifying them - prevents memory leak
    // Dead sessions with no subscribers will be cleaned up by interval
    session.subscribers.clear()
  })

  sessions.set(sessionId, session)
  logger.info(`[Terminal] Created session ${sessionId} in ${validWorkdir}`)
  
  return session
}

export function getTerminalSession(sessionId: string): TerminalSession | undefined {
  const session = sessions.get(sessionId)
  if (session) {
    session.lastActivity = Date.now()
  }
  return session
}

export function writeToTerminal(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId)
  if (!session || !session.alive) {
    logger.warn(`[Terminal] Cannot write to session ${sessionId}: ${!session ? 'not found' : 'not alive'}`)
    return false
  }
  
  session.lastActivity = Date.now()
  
  try {
    session.pty.write(data)
    return true
  } catch (err) {
    logger.error(`[Terminal] Error writing to session ${sessionId}:`, err)
    return false
  }
}

export function resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
  const session = sessions.get(sessionId)
  if (!session || !session.alive) {
    return false
  }
  
  session.lastActivity = Date.now()
  
  try {
    session.pty.resize(Math.max(cols, 10), Math.max(rows, 2))
    return true
  } catch (err) {
    logger.error(`[Terminal] Error resizing session ${sessionId}:`, err)
    return false
  }
}

export function killTerminalSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) {
    return false
  }
  
  try {
    if (session.alive) {
      session.pty.kill()
    }
  } catch {
    // Ignore kill errors
  }
  
  session.alive = false
  sessions.delete(sessionId)
  logger.info(`[Terminal] Killed session ${sessionId}`)
  return true
}

export function subscribeToTerminal(
  sessionId: string,
  callback: (data: string) => void
): (() => void) | null {
  const session = sessions.get(sessionId)
  if (!session) {
    logger.warn(`[Terminal] Cannot subscribe to session ${sessionId}: not found`)
    return null
  }
  
  session.subscribers.add(callback)
  session.lastActivity = Date.now()
  
  // Flush buffered output to new subscriber
  if (session.outputBuffer.length > 0) {
    const bufferedOutput = session.outputBuffer.join('')
    session.outputBuffer = []
    logger.info(`[Terminal] Flushing ${bufferedOutput.length} bytes to new subscriber`)
    
    try {
      callback(bufferedOutput)
    } catch (err) {
      logger.error(`[Terminal] Error flushing buffer:`, err)
    }
  }
  
  session.hasHadSubscriber = true
  
  // If session is dead, notify subscriber
  if (!session.alive) {
    try {
      callback('\r\n[Session ended. Create a new terminal.]\r\n')
    } catch {
      // Ignore
    }
  }
  
  return () => {
    session.subscribers.delete(callback)
    logger.debug(`[Terminal] Subscriber removed from ${sessionId}, remaining: ${session.subscribers.size}`)
  }
}

export function listTerminalSessions(): Array<{
  id: string
  workdir: string
  createdAt: number
  lastActivity: number
  subscriberCount: number
  alive: boolean
}> {
  return Array.from(sessions.values()).map(session => ({
    id: session.id,
    workdir: session.workdir,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    subscriberCount: session.subscribers.size,
    alive: session.alive,
  }))
}

function cleanupInactiveSessions() {
  const now = Date.now()
  
  for (const [sessionId, session] of sessions) {
    const inactive = now - session.lastActivity > SESSION_TIMEOUT_MS
    const dead = !session.alive && session.subscribers.size === 0
    
    if (inactive || dead) {
      logger.info(`[Terminal] Cleaning up session ${sessionId} (inactive=${inactive}, dead=${dead})`)
      
      try {
        if (session.alive) {
          session.pty.kill()
        }
      } catch {
        // Ignore cleanup errors
      }
      
      sessions.delete(sessionId)
    }
  }
}

// Start cleanup interval
setInterval(cleanupInactiveSessions, CLEANUP_INTERVAL_MS)

// Export for testing
export function getSessionCount(): number {
  return sessions.size
}
