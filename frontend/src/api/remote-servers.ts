const API_BASE = '/api/remote-servers'

export interface RemoteServer {
  id: number
  name: string
  host: string
  port: number
  enabled: boolean
  createdAt: number
  updatedAt: number
  lastSeen?: number
}

export interface CreateRemoteServerInput {
  name: string
  host: string
  port?: number
}

export interface UpdateRemoteServerInput {
  name?: string
  host?: string
  port?: number
  enabled?: boolean
}

export interface TestResult {
  status: 'healthy' | 'unhealthy'
  message: string
}

export const remoteServersApi = {
  async list(): Promise<RemoteServer[]> {
    const response = await fetch(API_BASE)
    if (!response.ok) {
      throw new Error('Failed to fetch remote servers')
    }
    return response.json()
  },

  async get(id: number): Promise<RemoteServer> {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch remote server')
    }
    return response.json()
  },

  async create(input: CreateRemoteServerInput): Promise<RemoteServer> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create remote server' }))
      throw new Error(error.error || 'Failed to create remote server')
    }
    return response.json()
  },

  async update(id: number, input: UpdateRemoteServerInput): Promise<RemoteServer> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update remote server' }))
      throw new Error(error.error || 'Failed to update remote server')
    }
    return response.json()
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete remote server')
    }
  },

  async test(id: number): Promise<TestResult> {
    const response = await fetch(`${API_BASE}/${id}/test`)
    if (!response.ok) {
      throw new Error('Failed to test connection')
    }
    return response.json()
  },
}
