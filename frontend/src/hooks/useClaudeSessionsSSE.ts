import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface SessionData {
  id: string
  title: string
  directory: string
  createdAt: number
  updatedAt: number
  sessionId: string
  firstPrompt: string
  messageCount: number
  projectPath: string
  created: string
  modified: string
  gitBranch?: string
  isSidechain: boolean
  server?: any // Optional server property for compatibility
}

interface SSEMessage {
  type: 'init' | 'session-created' | 'session-updated' | 'session-deleted' | 'refresh'
  sessions: SessionData[]
  timestamp: number
}

export interface UseClaudeSessionsSSEOptions {
  enabled?: boolean
  onSessionChange?: (type: string, sessions: SessionData[]) => void
}

export function useClaudeSessionsSSE(options: UseClaudeSessionsSSEOptions = {}) {
  const { enabled = true, onSessionChange } = options
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const queryClient = useQueryClient()

  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 2000

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return

    try {
      const baseUrl = import.meta.env.DEV ? 'http://localhost:5001' : ''
      const eventSource = new EventSource(`${baseUrl}/api/claude-sessions/stream`)

      eventSource.onopen = () => {
        console.log('[ClaudeSSE] Connected to real-time session updates')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      // Initial data
      eventSource.addEventListener('init', (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data)
          console.log('[ClaudeSSE] Received initial sessions:', data.sessions.length)
          setSessions(data.sessions)
          queryClient.setQueryData(['claude-sessions'], data.sessions)
        } catch (err) {
          console.error('[ClaudeSSE] Error parsing init message:', err)
        }
      })

      // Session created
      eventSource.addEventListener('session-created', (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data)
          console.log('[ClaudeSSE] Session created, total:', data.sessions.length)
          setSessions(data.sessions)
          queryClient.setQueryData(['claude-sessions'], data.sessions)
          onSessionChange?.('session-created', data.sessions)
        } catch (err) {
          console.error('[ClaudeSSE] Error parsing session-created:', err)
        }
      })

      // Session updated
      eventSource.addEventListener('session-updated', (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data)
          console.log('[ClaudeSSE] Session updated, total:', data.sessions.length)
          setSessions(data.sessions)
          queryClient.setQueryData(['claude-sessions'], data.sessions)
          onSessionChange?.('session-updated', data.sessions)
        } catch (err) {
          console.error('[ClaudeSSE] Error parsing session-updated:', err)
        }
      })

      // Session deleted
      eventSource.addEventListener('session-deleted', (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data)
          console.log('[ClaudeSSE] Session deleted, total:', data.sessions.length)
          setSessions(data.sessions)
          queryClient.setQueryData(['claude-sessions'], data.sessions)
          onSessionChange?.('session-deleted', data.sessions)
        } catch (err) {
          console.error('[ClaudeSSE] Error parsing session-deleted:', err)
        }
      })

      // Refresh
      eventSource.addEventListener('refresh', (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data)
          console.log('[ClaudeSSE] Refresh, total:', data.sessions.length)
          setSessions(data.sessions)
          queryClient.setQueryData(['claude-sessions'], data.sessions)
          onSessionChange?.('refresh', data.sessions)
        } catch (err) {
          console.error('[ClaudeSSE] Error parsing refresh:', err)
        }
      })

      // Keepalive
      eventSource.addEventListener('keepalive', () => {
        // Just to keep connection alive
      })

      eventSource.onerror = (err) => {
        console.error('[ClaudeSSE] Connection error:', err)
        setIsConnected(false)
        setError(new Error('SSE connection failed'))

        // Close current connection
        eventSource.close()
        eventSourceRef.current = null

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(
            `[ClaudeSSE] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY * reconnectAttemptsRef.current)
        } else {
          console.error('[ClaudeSSE] Max reconnection attempts reached')
        }
      }

      eventSourceRef.current = eventSource
    } catch (err) {
      console.error('[ClaudeSSE] Failed to create EventSource:', err)
      setError(err as Error)
    }
  }, [enabled, onSessionChange, queryClient])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[ClaudeSSE] Disconnecting')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    sessions,
    isConnected,
    error,
    reconnect
  }
}
