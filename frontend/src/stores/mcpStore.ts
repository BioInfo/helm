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

  if (state.status === 'running' && 'time' in state) {
    baseCall.startTime = state.time.start
    baseCall.title = state.title
  } else if (state.status === 'completed' && 'time' in state) {
    baseCall.startTime = state.time.start
    baseCall.endTime = state.time.end
    baseCall.duration = state.time.end - state.time.start
    baseCall.output = state.output
    baseCall.title = state.title
  } else if (state.status === 'error' && 'time' in state) {
    baseCall.startTime = state.time.start
    baseCall.endTime = state.time.end
    baseCall.duration = state.time.end - state.time.start
    baseCall.error = state.error
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
        const sortedKeys = Array.from(newCalls.keys())
        const keysToRemove = sortedKeys.slice(0, newCalls.size - MAX_STORED_CALLS)
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

export const useActiveToolCallCount = (): number => {
  return useMCPStore((state) => state.activeCallIds.size)
}

export const useToolCallsForSession = (sessionId: string | undefined): MCPToolCall[] => {
  return useMCPStore((state) => {
    if (!sessionId) return []
    return Array.from(state.toolCalls.values())
      .filter(c => c.sessionId === sessionId)
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
  })
}
