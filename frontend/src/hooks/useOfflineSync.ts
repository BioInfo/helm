import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  cacheSession,
  cacheMessages,
  getCachedSession,
  getCachedMessages,
  getPendingMessages,
  updatePendingMessageStatus,
  removePendingMessage,
  addPendingMessage,
  isOnline,
} from '@/lib/offline/db'
import type { MessageWithParts, Session } from '@/api/types'
import { showToast } from '@/lib/toast'

interface UseOfflineSyncOptions {
  serverId: string
  sessionId?: string
  enabled?: boolean
}

export function useOfflineSync({
  serverId,
  sessionId,
  enabled = true,
}: UseOfflineSyncOptions) {
  const queryClient = useQueryClient()
  const syncInProgressRef = useRef(false)

  const syncPendingMessages = useCallback(async () => {
    if (!enabled || syncInProgressRef.current) return
    
    const online = await isOnline()
    if (!online) return

    syncInProgressRef.current = true
    
    try {
      const pending = await getPendingMessages()
      
      for (const msg of pending) {
        if (msg.status === 'sending') continue
        if (msg.retryCount >= 3) {
          await updatePendingMessageStatus(msg.id, 'failed')
          continue
        }

        await updatePendingMessageStatus(msg.id, 'sending')

        try {
          const response = await fetch(`/api/session/${msg.sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parts: msg.parts,
              model: msg.model ? (() => {
                const [providerID, modelID] = msg.model.split('/')
                return { providerID, modelID }
              })() : undefined,
              agent: msg.agent,
            }),
          })

          if (response.ok) {
            await removePendingMessage(msg.id)
            queryClient.invalidateQueries({
              queryKey: ['opencode', 'messages'],
            })
          } else {
            await updatePendingMessageStatus(msg.id, 'pending', true)
          }
        } catch {
          await updatePendingMessageStatus(msg.id, 'pending', true)
        }
      }
    } finally {
      syncInProgressRef.current = false
    }
  }, [enabled, queryClient])

  const cacheSessionData = useCallback(
    async (session: Session) => {
      if (!enabled) return
      await cacheSession(serverId, session)
    },
    [enabled, serverId]
  )

  const cacheMessageData = useCallback(
    async (messages: MessageWithParts[]) => {
      if (!enabled || !sessionId) return
      await cacheMessages(serverId, sessionId, messages)
    },
    [enabled, serverId, sessionId]
  )

  const getCachedSessionData = useCallback(async (): Promise<
    Session | undefined
  > => {
    if (!enabled || !sessionId) return undefined
    return getCachedSession(serverId, sessionId)
  }, [enabled, serverId, sessionId])

  const getCachedMessageData = useCallback(async (): Promise<
    MessageWithParts[] | undefined
  > => {
    if (!enabled || !sessionId) return undefined
    return getCachedMessages(serverId, sessionId)
  }, [enabled, serverId, sessionId])

  const queueMessage = useCallback(
    async (
      prompt: string,
      parts: unknown[],
      model?: string,
      agent?: string
    ): Promise<string | null> => {
      if (!enabled || !sessionId) return null
      
      const online = await isOnline()
      if (online) return null
      
      const id = await addPendingMessage(
        serverId,
        sessionId,
        prompt,
        parts,
        model,
        agent
      )
      
      showToast.info('Message queued', {
        description: 'Will be sent when back online',
      })
      
      return id
    },
    [enabled, serverId, sessionId]
  )

  useEffect(() => {
    if (!enabled) return

    const handleOnline = () => {
      showToast.success('Back online', {
        description: 'Syncing pending messages...',
      })
      syncPendingMessages()
    }

    const handleOffline = () => {
      showToast.warning('Offline mode', {
        description: 'Messages will be queued',
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    syncPendingMessages()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled, syncPendingMessages])

  return {
    cacheSessionData,
    cacheMessageData,
    getCachedSessionData,
    getCachedMessageData,
    queueMessage,
    syncPendingMessages,
  }
}
