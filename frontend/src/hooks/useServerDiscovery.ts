import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerStore, useSelectedServerUrl, type OpenCodeServer } from '@/stores/serverStore'

const POLL_INTERVAL = 10000

export function useServerDiscovery() {
  const { setServers, setLoading, setError } = useServerStore()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['servers'],
    queryFn: async (): Promise<OpenCodeServer[]> => {
      const response = await fetch('/api/servers')
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.statusText}`)
      }
      return response.json()
    },
    refetchInterval: POLL_INTERVAL,
    staleTime: 5000,
  })

  useEffect(() => {
    setLoading(isLoading)
  }, [isLoading, setLoading])

  useEffect(() => {
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch servers')
    }
  }, [error, setError])

  useEffect(() => {
    if (data) {
      setServers(data)
    }
  }, [data, setServers])

  return {
    servers: data ?? [],
    isLoading,
    error,
    refetch,
  }
}

export function useOpcodeUrl(): string | null {
  return useSelectedServerUrl()
}
