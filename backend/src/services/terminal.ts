import * as pty from 'node-pty'
import { logger } from '../utils/logger'

export interface TerminalSession {
  id: string
  pty: pty.IPty
  workdir: string
  createdAt: number
  lastActivity: number
  subscribers: Set<(data: string) => void>
}

const sessions = new Map<string, TerminalSession>()

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000

function getShell(): string {
  return process.env.SHELL || '/bin/bash'
}

export function createTerminalSession(sessionId: string, workdir: string): TerminalSession {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId)!
    existing.lastActivity = Date.now()
    return existing
  }

  const shell = getShell()
  
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: workdir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    },
  })

  const session: TerminalSession = {
    id: sessionId,
    pty: ptyProcess,
    workdir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    subscribers: new Set(),
  }

  ptyProcess.onData((data) => {
    session.lastActivity = Date.now()
    for (const subscriber of session.subscribers) {
      try {
        subscriber(data)
      } catch (err) {
        logger.error(`Failed to send data to subscriber for session ${sessionId}:`, err)
      }
    }
  })

  ptyProcess.onExit(({ exitCode, signal }) => {
    logger.info(`Terminal session ${sessionId} exited with code ${exitCode}, signal ${signal}`)
    sessions.delete(sessionId)
  })

  sessions.set(sessionId, session)
  logger.info(`Created terminal session ${sessionId} in ${workdir}`)
  
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
  if (!session) {
    return false
  }
  
  session.lastActivity = Date.now()
  session.pty.write(data)
  return true
}

export function resizeTerminal(sessionId: string, cols: number, rows: number): boolean {
  const session = sessions.get(sessionId)
  if (!session) {
    return false
  }
  
  session.lastActivity = Date.now()
  session.pty.resize(cols, rows)
  return true
}

export function killTerminalSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) {
    return false
  }
  
  session.pty.kill()
  sessions.delete(sessionId)
  logger.info(`Killed terminal session ${sessionId}`)
  return true
}

export function subscribeToTerminal(
  sessionId: string,
  callback: (data: string) => void
): (() => void) | null {
  const session = sessions.get(sessionId)
  if (!session) {
    return null
  }
  
  session.subscribers.add(callback)
  session.lastActivity = Date.now()
  
  return () => {
    session.subscribers.delete(callback)
  }
}

export function listTerminalSessions(): Array<{
  id: string
  workdir: string
  createdAt: number
  lastActivity: number
  subscriberCount: number
}> {
  return Array.from(sessions.values()).map(session => ({
    id: session.id,
    workdir: session.workdir,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    subscriberCount: session.subscribers.size,
  }))
}

function cleanupInactiveSessions() {
  const now = Date.now()
  
  for (const [sessionId, session] of sessions) {
    if (session.subscribers.size === 0 && now - session.lastActivity > SESSION_TIMEOUT_MS) {
      logger.info(`Cleaning up inactive terminal session ${sessionId}`)
      session.pty.kill()
      sessions.delete(sessionId)
    }
  }
}

setInterval(cleanupInactiveSessions, CLEANUP_INTERVAL_MS)
