import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { MessageWithParts, Session } from '@/api/types'

interface HelmDB extends DBSchema {
  sessions: {
    key: string
    value: {
      id: string
      serverId: string
      data: Session
      cachedAt: number
    }
    indexes: { 'by-server': string; 'by-cached': number }
  }
  messages: {
    key: string
    value: {
      id: string
      sessionId: string
      serverId: string
      messages: MessageWithParts[]
      cachedAt: number
    }
    indexes: { 'by-session': string; 'by-cached': number }
  }
  pendingMessages: {
    key: string
    value: {
      id: string
      sessionId: string
      serverId: string
      prompt: string
      parts: unknown[]
      model?: string
      agent?: string
      createdAt: number
      status: 'pending' | 'sending' | 'failed'
      retryCount: number
    }
    indexes: { 'by-session': string; 'by-status': string }
  }
}

const DB_NAME = 'helm-offline'
const DB_VERSION = 1
const MAX_CACHED_SESSIONS = 50
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000

let dbPromise: Promise<IDBPDatabase<HelmDB>> | null = null

function getDB(): Promise<IDBPDatabase<HelmDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HelmDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-server', 'serverId')
        sessionStore.createIndex('by-cached', 'cachedAt')

        const messageStore = db.createObjectStore('messages', { keyPath: 'id' })
        messageStore.createIndex('by-session', 'sessionId')
        messageStore.createIndex('by-cached', 'cachedAt')

        const pendingStore = db.createObjectStore('pendingMessages', { keyPath: 'id' })
        pendingStore.createIndex('by-session', 'sessionId')
        pendingStore.createIndex('by-status', 'status')
      },
    })
  }
  return dbPromise
}

export async function cacheSession(
  serverId: string,
  session: Session
): Promise<void> {
  const db = await getDB()
  await db.put('sessions', {
    id: `${serverId}:${session.id}`,
    serverId,
    data: session,
    cachedAt: Date.now(),
  })
  await cleanupOldCache()
}

export async function getCachedSession(
  serverId: string,
  sessionId: string
): Promise<Session | undefined> {
  const db = await getDB()
  const cached = await db.get('sessions', `${serverId}:${sessionId}`)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt > MAX_CACHE_AGE_MS) {
    await db.delete('sessions', `${serverId}:${sessionId}`)
    return undefined
  }
  return cached.data
}

export async function getCachedSessionsForServer(
  serverId: string
): Promise<Session[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('sessions', 'by-server', serverId)
  const now = Date.now()
  return all
    .filter((s) => now - s.cachedAt < MAX_CACHE_AGE_MS)
    .map((s) => s.data)
}

export async function cacheMessages(
  serverId: string,
  sessionId: string,
  messages: MessageWithParts[]
): Promise<void> {
  const db = await getDB()
  await db.put('messages', {
    id: `${serverId}:${sessionId}`,
    sessionId,
    serverId,
    messages,
    cachedAt: Date.now(),
  })
}

export async function getCachedMessages(
  serverId: string,
  sessionId: string
): Promise<MessageWithParts[] | undefined> {
  const db = await getDB()
  const cached = await db.get('messages', `${serverId}:${sessionId}`)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt > MAX_CACHE_AGE_MS) {
    await db.delete('messages', `${serverId}:${sessionId}`)
    return undefined
  }
  return cached.messages
}

export async function addPendingMessage(
  serverId: string,
  sessionId: string,
  prompt: string,
  parts: unknown[],
  model?: string,
  agent?: string
): Promise<string> {
  const db = await getDB()
  const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await db.put('pendingMessages', {
    id,
    sessionId,
    serverId,
    prompt,
    parts,
    model,
    agent,
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
  })
  return id
}

export async function getPendingMessages(
  sessionId?: string
): Promise<HelmDB['pendingMessages']['value'][]> {
  const db = await getDB()
  if (sessionId) {
    return db.getAllFromIndex('pendingMessages', 'by-session', sessionId)
  }
  return db.getAllFromIndex('pendingMessages', 'by-status', 'pending')
}

export async function updatePendingMessageStatus(
  id: string,
  status: 'pending' | 'sending' | 'failed',
  incrementRetry = false
): Promise<void> {
  const db = await getDB()
  const pending = await db.get('pendingMessages', id)
  if (pending) {
    pending.status = status
    if (incrementRetry) {
      pending.retryCount++
    }
    await db.put('pendingMessages', pending)
  }
}

export async function removePendingMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingMessages', id)
}

async function cleanupOldCache(): Promise<void> {
  const db = await getDB()
  const now = Date.now()

  const oldSessions = await db.getAllFromIndex('sessions', 'by-cached')
  const expiredSessions = oldSessions.filter(
    (s) => now - s.cachedAt > MAX_CACHE_AGE_MS
  )
  for (const s of expiredSessions) {
    await db.delete('sessions', s.id)
  }

  const remainingSessions = await db.getAllFromIndex('sessions', 'by-cached')
  if (remainingSessions.length > MAX_CACHED_SESSIONS) {
    const toRemove = remainingSessions
      .sort((a, b) => a.cachedAt - b.cachedAt)
      .slice(0, remainingSessions.length - MAX_CACHED_SESSIONS)
    for (const s of toRemove) {
      await db.delete('sessions', s.id)
    }
  }

  const oldMessages = await db.getAllFromIndex('messages', 'by-cached')
  const expiredMessages = oldMessages.filter(
    (m) => now - m.cachedAt > MAX_CACHE_AGE_MS
  )
  for (const m of expiredMessages) {
    await db.delete('messages', m.id)
  }
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB()
  await db.clear('sessions')
  await db.clear('messages')
}

export async function isOnline(): Promise<boolean> {
  return navigator.onLine
}
