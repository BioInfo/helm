import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TokenUsage {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

export interface SessionUsage {
  sessionId: string
  tokens: TokenUsage
  cost: number
  messageCount: number
  lastUpdated: number
}

export interface ModelCostRates {
  providerId: string
  modelId: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  cacheReadCostPerMillion?: number
  cacheWriteCostPerMillion?: number
}

interface ObservabilityState {
  sessionUsage: Map<string, SessionUsage>
  customCostRates: ModelCostRates[]
  
  updateSessionUsage: (sessionId: string, tokens: Partial<TokenUsage>, cost: number) => void
  incrementMessageCount: (sessionId: string) => void
  getSessionUsage: (sessionId: string) => SessionUsage | undefined
  getTotalUsage: () => { tokens: TokenUsage; cost: number; sessionCount: number }
  clearSessionUsage: (sessionId: string) => void
  clearAllUsage: () => void
  setCostRates: (rates: ModelCostRates) => void
  getCostRates: (providerId: string, modelId: string) => ModelCostRates | undefined
}

const EMPTY_TOKEN_USAGE: TokenUsage = {
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
}

const createEmptyTokenUsage = (): TokenUsage => ({ ...EMPTY_TOKEN_USAGE })

const createEmptySessionUsage = (sessionId: string): SessionUsage => ({
  sessionId,
  tokens: createEmptyTokenUsage(),
  cost: 0,
  messageCount: 0,
  lastUpdated: Date.now(),
})

export const useObservabilityStore = create<ObservabilityState>()(
  persist(
    (set, get) => ({
      sessionUsage: new Map(),
      customCostRates: [],

      updateSessionUsage: (sessionId, tokens, cost) => {
        set((state) => {
          const newUsage = new Map(state.sessionUsage)
          const existing = newUsage.get(sessionId) || createEmptySessionUsage(sessionId)
          
          const updatedTokens: TokenUsage = {
            input: existing.tokens.input + (tokens.input || 0),
            output: existing.tokens.output + (tokens.output || 0),
            reasoning: existing.tokens.reasoning + (tokens.reasoning || 0),
            cacheRead: existing.tokens.cacheRead + (tokens.cacheRead || 0),
            cacheWrite: existing.tokens.cacheWrite + (tokens.cacheWrite || 0),
          }
          
          newUsage.set(sessionId, {
            ...existing,
            tokens: updatedTokens,
            cost: existing.cost + cost,
            lastUpdated: Date.now(),
          })
          
          return { sessionUsage: newUsage }
        })
      },

      incrementMessageCount: (sessionId) => {
        set((state) => {
          const newUsage = new Map(state.sessionUsage)
          const existing = newUsage.get(sessionId) || createEmptySessionUsage(sessionId)
          
          newUsage.set(sessionId, {
            ...existing,
            messageCount: existing.messageCount + 1,
            lastUpdated: Date.now(),
          })
          
          return { sessionUsage: newUsage }
        })
      },

      getSessionUsage: (sessionId) => {
        return get().sessionUsage.get(sessionId)
      },

      getTotalUsage: () => {
        const { sessionUsage } = get()
        const totals: TokenUsage = createEmptyTokenUsage()
        let totalCost = 0
        
        sessionUsage.forEach((usage) => {
          totals.input += usage.tokens.input
          totals.output += usage.tokens.output
          totals.reasoning += usage.tokens.reasoning
          totals.cacheRead += usage.tokens.cacheRead
          totals.cacheWrite += usage.tokens.cacheWrite
          totalCost += usage.cost
        })
        
        return {
          tokens: totals,
          cost: totalCost,
          sessionCount: sessionUsage.size,
        }
      },

      clearSessionUsage: (sessionId) => {
        set((state) => {
          const newUsage = new Map(state.sessionUsage)
          newUsage.delete(sessionId)
          return { sessionUsage: newUsage }
        })
      },

      clearAllUsage: () => {
        set({ sessionUsage: new Map() })
      },

      setCostRates: (rates) => {
        set((state) => {
          const newRates = state.customCostRates.filter(
            (r) => !(r.providerId === rates.providerId && r.modelId === rates.modelId)
          )
          return { customCostRates: [...newRates, rates] }
        })
      },

      getCostRates: (providerId, modelId) => {
        return get().customCostRates.find(
          (r) => r.providerId === providerId && r.modelId === modelId
        )
      },
    }),
    {
      name: 'helm-observability',
      partialize: (state) => ({
        sessionUsage: Array.from(state.sessionUsage.entries()),
        customCostRates: state.customCostRates,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as {
          sessionUsage?: [string, SessionUsage][]
          customCostRates?: ModelCostRates[]
        }
        return {
          ...current,
          sessionUsage: new Map(persistedState.sessionUsage || []),
          customCostRates: persistedState.customCostRates || [],
        }
      },
    }
  )
)

export const useSessionCost = (sessionId: string | undefined): number => {
  return useObservabilityStore((state) => {
    if (!sessionId) return 0
    return state.sessionUsage.get(sessionId)?.cost || 0
  })
}

export const useSessionTokens = (sessionId: string | undefined): TokenUsage => {
  return useObservabilityStore((state) => {
    if (!sessionId) return EMPTY_TOKEN_USAGE
    return state.sessionUsage.get(sessionId)?.tokens || EMPTY_TOKEN_USAGE
  })
}

export const useTotalCost = (): number => {
  return useObservabilityStore((state) => {
    let total = 0
    state.sessionUsage.forEach((usage) => {
      total += usage.cost
    })
    return total
  })
}

export const formatCost = (cost: number): string => {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`
  }
  return `$${cost.toFixed(2)}`
}

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}
