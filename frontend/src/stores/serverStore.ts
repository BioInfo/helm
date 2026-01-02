import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OpenCodeServer {
  id: string
  pid: number
  port: number
  mode: 'tui' | 'serve'
  workdir: string
  status: 'healthy' | 'unhealthy'
  projectName?: string
  isRemote?: boolean
  remoteHost?: string
}

export interface ServerConfigResponse {
  serverId: string
  projectName: string
  workdir: string
  config: {
    mcp?: Record<string, McpServerConfig>
    agents?: Record<string, unknown>
    commands?: Record<string, unknown>
    [key: string]: unknown
  }
}

export interface McpServerConfig {
  type?: 'local' | 'remote'
  enabled?: boolean
  command?: string[]
  url?: string
  environment?: Record<string, string>
  timeout?: number
}

export interface ServerMcpStatusResponse {
  serverId: string
  projectName: string
  status: Record<string, McpStatus>
}

export interface McpStatus {
  status: 'connected' | 'disabled' | 'failed' | 'needs_auth' | 'needs_client_registration'
  error?: string
}

interface ServerStore {
  servers: OpenCodeServer[]
  selectedServerId: string | null
  isLoading: boolean
  lastRefresh: number | null
  error: string | null
  
  setServers: (servers: OpenCodeServer[]) => void
  selectServer: (serverId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  getSelectedServer: () => OpenCodeServer | null
  refreshServers: () => Promise<void>
}

const STORAGE_KEY = 'helm-server-store'

export const useServerStore = create<ServerStore>()(
  persist(
    (set, get) => ({
      servers: [],
      selectedServerId: null,
      isLoading: false,
      lastRefresh: null,
      error: null,

      setServers: (servers) => {
        const currentSelectedId = get().selectedServerId
        const selectedStillExists = servers.some(s => s.id === currentSelectedId)
        
        set({
          servers,
          lastRefresh: Date.now(),
          error: null,
          // Auto-select first healthy server if current selection is invalid
          selectedServerId: selectedStillExists 
            ? currentSelectedId 
            : servers.find(s => s.status === 'healthy')?.id ?? servers[0]?.id ?? null
        })
      },

      selectServer: (serverId) => {
        set({ selectedServerId: serverId })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error, isLoading: false })
      },

      getSelectedServer: () => {
        const { servers, selectedServerId } = get()
        return servers.find(s => s.id === selectedServerId) ?? null
      },

      refreshServers: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch('/api/servers/refresh', { method: 'POST' })
          if (!response.ok) {
            throw new Error(`Failed to refresh servers: ${response.statusText}`)
          }
          const servers = await response.json() as OpenCodeServer[]
          get().setServers(servers)
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh servers',
            isLoading: false 
          })
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ 
        selectedServerId: state.selectedServerId 
      }),
    }
  )
)

export const useSelectedServer = (): OpenCodeServer | null => {
  return useServerStore((state) => {
    const { servers, selectedServerId } = state
    return servers.find(s => s.id === selectedServerId) ?? null
  })
}

export const useSelectedServerUrl = (): string | null => {
  return useServerStore((state) => {
    const { servers, selectedServerId } = state
    const server = servers.find(s => s.id === selectedServerId)
    return server ? `/api/servers/${server.id}/proxy` : null
  })
}

export const useServerForDirectory = (directory: string | undefined): OpenCodeServer | null => {
  return useServerStore((state) => {
    if (!directory) return null
    const { servers } = state
    return servers.find(s => 
      s.workdir === directory || 
      directory.startsWith(s.workdir + '/') ||
      s.workdir.startsWith(directory + '/')
    ) ?? null
  })
}

export const useServerUrlForDirectory = (directory: string | undefined): string | null => {
  return useServerStore((state) => {
    if (!directory) {
      const { servers, selectedServerId } = state
      const server = servers.find(s => s.id === selectedServerId)
      return server ? `/api/servers/${server.id}/proxy` : null
    }
    const { servers } = state
    const matchingServer = servers.find(s => 
      s.workdir === directory || 
      directory.startsWith(s.workdir + '/') ||
      s.workdir.startsWith(directory + '/')
    )
    return matchingServer ? `/api/servers/${matchingServer.id}/proxy` : null
  })
}
