import { API_BASE_URL } from '@/config'
import type { 
  OpenCodeServer, 
  ServerConfigResponse, 
  ServerMcpStatusResponse,
  McpStatus 
} from '@/stores/serverStore'

export const serversApi = {
  async getServers(): Promise<OpenCodeServer[]> {
    const response = await fetch(`${API_BASE_URL}/api/servers`)
    if (!response.ok) {
      throw new Error(`Failed to fetch servers: ${response.statusText}`)
    }
    return response.json()
  },

  async refreshServers(): Promise<OpenCodeServer[]> {
    const response = await fetch(`${API_BASE_URL}/api/servers/refresh`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Failed to refresh servers: ${response.statusText}`)
    }
    return response.json()
  },

  async getServerConfig(serverId: string): Promise<ServerConfigResponse> {
    const response = await fetch(`${API_BASE_URL}/api/servers/${encodeURIComponent(serverId)}/config`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to fetch server config: ${response.statusText}`)
    }
    return response.json()
  },

  async getServerMcpStatus(serverId: string): Promise<ServerMcpStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/servers/${encodeURIComponent(serverId)}/mcp`)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to fetch MCP status: ${response.statusText}`)
    }
    return response.json()
  },

  async connectMcp(serverId: string, mcpName: string): Promise<boolean> {
    const response = await fetch(
      `${API_BASE_URL}/api/servers/${encodeURIComponent(serverId)}/mcp/${encodeURIComponent(mcpName)}/connect`,
      { method: 'POST' }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to connect MCP server: ${response.statusText}`)
    }
    return true
  },

  async disconnectMcp(serverId: string, mcpName: string): Promise<boolean> {
    const response = await fetch(
      `${API_BASE_URL}/api/servers/${encodeURIComponent(serverId)}/mcp/${encodeURIComponent(mcpName)}/disconnect`,
      { method: 'POST' }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to disconnect MCP server: ${response.statusText}`)
    }
    return true
  },

  async authenticateMcp(serverId: string, mcpName: string): Promise<McpStatus> {
    const response = await fetch(
      `${API_BASE_URL}/api/servers/${encodeURIComponent(serverId)}/mcp/${encodeURIComponent(mcpName)}/auth/authenticate`,
      { method: 'POST' }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(error.error || `Failed to authenticate MCP server: ${response.statusText}`)
    }
    return response.json()
  },
}
