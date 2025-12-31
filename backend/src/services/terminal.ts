import * as pty from 'node-pty'
import * as fs from 'fs'
import { logger } from '../utils/logger'

export interface TerminalSession {
  id: string
  pty: pty.IPty
  workdir: string
  createdAt: number
  lastActivity: number
  subscribers: Set<(data: string) => void>
  outputBuffer: string[]  // Buffer output until first subscriber
  hasHadSubscriber: boolean
}

const sessions = new Map<string, TerminalSession>()

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000

function getShell(): string {
  const shell = '/bin/bash'
  logger.info(`[Terminal] Using shell: ${shell}`)
  return shell
}

export function createTerminalSession(sessionId: string, workdir: string): TerminalSession {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId)!
    existing.lastActivity = Date.now()
    return existing
  }

  const shell = getShell()
  
  logger.info(`[Terminal] Creating session ${sessionId}`)
  logger.info(`[Terminal] Shell: ${shell}`)
  logger.info(`[Terminal] Workdir: ${workdir}`)
  logger.info(`[Terminal] node-pty available: ${typeof pty.spawn === 'function'}`)
  
  try {
    fs.accessSync(shell, fs.constants.X_OK)
    logger.info(`[Terminal] Shell ${shell} is executable`)
  } catch (err) {
    logger.error(`[Terminal] Shell ${shell} not accessible:`, err)
  }
  
  try {
    fs.accessSync(workdir, fs.constants.R_OK)
    logger.info(`[Terminal] Workdir ${workdir} is accessible`)
  } catch (err) {
    logger.error(`[Terminal] Workdir ${workdir} not accessible:`, err)
  }
  
  logger.info(`[Terminal] Spawning PTY with shell: ${shell}`)
  const ptyProcess = pty.spawn(shell, ['--norc', '--noprofile', '-i'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: workdir,
    env: {
      HOME: process.env.HOME || '/tmp',
      PATH: process.env.PATH || '/usr/bin:/bin',
      TERM: 'xterm-256color',
      PS1: '\\$ ',
      USER: process.env.USER || 'user',
    },
  })
  logger.info(`[Terminal] PTY spawned, pid: ${ptyProcess.pid}`)

  const session: TerminalSession = {
    id: sessionId,
    pty: ptyProcess,
    workdir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    subscribers: new Set(),
    outputBuffer: [],
    hasHadSubscriber: false,
  }

  ptyProcess.onData((data) => {
    session.lastActivity = Date.now()
    logger.info(`[Terminal] PTY output for ${sessionId}: ${data.length} bytes, subscribers: ${session.subscribers.size}`)
    
    if (session.subscribers.size === 0 && !session.hasHadSubscriber) {
      session.outputBuffer.push(data)
      logger.info(`[Terminal] Buffered output for ${sessionId}, buffer size: ${session.outputBuffer.length}`)
      if (session.outputBuffer.length > 1000) {
        session.outputBuffer.shift()
      }
      return
    }
    
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
  
  if (!session.hasHadSubscriber && session.outputBuffer.length > 0) {
    session.hasHadSubscriber = true
    const bufferedOutput = session.outputBuffer.join('')
    session.outputBuffer = []
    logger.info(`[Terminal] Flushing ${bufferedOutput.length} bytes of buffered output for ${sessionId}`)
    try {
      callback(bufferedOutput)
    } catch (err) {
      logger.error(`Failed to send buffered data to subscriber for session ${sessionId}:`, err)
    }
  } else {
    logger.info(`[Terminal] No buffered output for ${sessionId}, hasHadSubscriber: ${session.hasHadSubscriber}, buffer: ${session.outputBuffer.length}`)
  }
  session.hasHadSubscriber = true
  
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
