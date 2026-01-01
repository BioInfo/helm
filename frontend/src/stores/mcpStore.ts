import { create } from 'zustand'
import type { components } from '@/api/opencode-types'

type ToolPart = components['schemas']['ToolPart']
type ToolState = components['schemas']['ToolState']

export interface MCPToolCall {
  id: string
  partId: string
  sessionId: string
  messageId: string
  serverId?: string
  serverName?: string
  toolName: string
  callId: string
  status: 'pending' | 'running' | 'completed' | 'error'
  input: Record<string, unknown>
  output?: string
  error?: string
  title?: string
  startTime?: number
  endTime?: number
  duration?: number
}

interface MCPStoreState {
  toolCalls: Map<string, MCPToolCall>
  activeCallIds: Set<string>
  
  addOrUpdateToolCall: (part: ToolPart, serverId?: string, serverName?: string) => void
  removeToolCall: (partId: string) => void
  clearSessionCalls: (sessionId: string) => void
  getCallsForSession: (sessionId: string) => MCPToolCall[]
  getActiveCalls: () => MCPToolCall[]
  getAllCalls: () => MCPToolCall[]
  getActiveCount: () => number
}

const MAX_STORED_CALLS = 500

function parseToolPart(part: ToolPart, serverId?: string, serverName?: string): MCPToolCall {
  const state = part.state as ToolState
  const baseCall: MCPToolCall = {
    id: `${part.sessionID}-${part.id}`,
    partId: part.id,
    sessionId: part.sessionID,
    messageId: part.messageID,
    serverId,
    serverName,
    toolName: part.tool,
    callId: part.callID,
    status: state.status,
    input: state.input || {},
  }

  const hasTime = 'time' in state && state.time && typeof state.time === 'object'

  if (state.status === 'running' && hasTime) {
    baseCall.startTime = (state.time as { start: number }).start
    baseCall.title = (state as { title?: string }).title
  } else if (state.status === 'completed' && hasTime) {
    const time = state.time as { start: number; end: number }
    baseCall.startTime = time.start
    baseCall.endTime = time.end
    baseCall.duration = time.end - time.start
    baseCall.output = (state as { output?: string }).output
    baseCall.title = (state as { title?: string }).title
  } else if (state.status === 'error' && hasTime) {
    const time = state.time as { start: number; end: number }
    baseCall.startTime = time.start
    baseCall.endTime = time.end
    baseCall.duration = time.end - time.start
    baseCall.error = (state as { error?: string }).error
  }

  return baseCall
}

export const useMCPStore = create<MCPStoreState>((set, get) => ({
  toolCalls: new Map(),
  activeCallIds: new Set(),

  addOrUpdateToolCall: (part, serverId, serverName) => {
    const call = parseToolPart(part, serverId, serverName)
    
    set((state) => {
      const newCalls = new Map(state.toolCalls)
      const newActiveIds = new Set(state.activeCallIds)
      
      newCalls.set(call.id, call)
      
      if (call.status === 'running' || call.status === 'pending') {
        newActiveIds.add(call.id)
      } else {
        newActiveIds.delete(call.id)
      }
      
      if (newCalls.size > MAX_STORED_CALLS) {
        const sortedByTime = Array.from(newCalls.entries())
          .sort((a, b) => (a[1].startTime || 0) - (b[1].startTime || 0))
        const keysToRemove = sortedByTime
          .slice(0, newCalls.size - MAX_STORED_CALLS)
          .map(([key]) => key)
        keysToRemove.forEach(key => {
          newCalls.delete(key)
          newActiveIds.delete(key)
        })
      }
      
      return { toolCalls: newCalls, activeCallIds: newActiveIds }
    })
  },

  removeToolCall: (partId) => {
    set((state) => {
      const newCalls = new Map(state.toolCalls)
      const newActiveIds = new Set(state.activeCallIds)
      
      for (const [key, call] of newCalls) {
        if (call.partId === partId) {
          newCalls.delete(key)
          newActiveIds.delete(key)
          break
        }
      }
      
      return { toolCalls: newCalls, activeCallIds: newActiveIds }
    })
  },

  clearSessionCalls: (sessionId) => {
    set((state) => {
      const newCalls = new Map(state.toolCalls)
      const newActiveIds = new Set(state.activeCallIds)
      
      for (const [key, call] of newCalls) {
        if (call.sessionId === sessionId) {
          newCalls.delete(key)
          newActiveIds.delete(key)
        }
      }
      
      return { toolCalls: newCalls, activeCallIds: newActiveIds }
    })
  },

  getCallsForSession: (sessionId) => {
    const calls = Array.from(get().toolCalls.values())
    return calls
      .filter(c => c.sessionId === sessionId)
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
  },

  getActiveCalls: () => {
    const { toolCalls, activeCallIds } = get()
    return Array.from(activeCallIds)
      .map(id => toolCalls.get(id))
      .filter((c): c is MCPToolCall => c !== undefined)
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
  },

  getAllCalls: () => {
    return Array.from(get().toolCalls.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
  },

  getActiveCount: () => {
    return get().activeCallIds.size
  },
}))

// Stable empty array to prevent infinite re-renders
const EMPTY_TOOL_CALLS: MCPToolCall[] = []

export const useActiveToolCallCount = (): number => {
  return useMCPStore((state) => state.activeCallIds.size)
}

export const useToolCallsForSession = (sessionId: string | undefined): MCPToolCall[] => {
  return useMCPStore((state) => {
    if (!sessionId) return EMPTY_TOOL_CALLS
    const calls = Array.from(state.toolCalls.values())
      .filter(c => c.sessionId === sessionId)
    if (calls.length === 0) return EMPTY_TOOL_CALLS
    return calls.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
  })
}
