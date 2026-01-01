import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serversApi } from '@/api/servers'
import { useServerStore } from '@/stores/serverStore'
import { showToast as toast } from '@/lib/toast'

export function useServerMcp() {
  const queryClient = useQueryClient()
  const selectedServerId = useServerStore((state) => state.selectedServerId)
  const selectedServer = useServerStore((state) => 
    state.servers.find(s => s.id === state.selectedServerId)
  )

  const configQuery = useQuery({
    queryKey: ['server-config', selectedServerId],
    queryFn: () => selectedServerId ? serversApi.getServerConfig(selectedServerId) : null,
    enabled: !!selectedServerId,
    staleTime: 10000,
  })

  const mcpStatusQuery = useQuery({
    queryKey: ['server-mcp-status', selectedServerId],
    queryFn: () => selectedServerId ? serversApi.getServerMcpStatus(selectedServerId) : null,
    enabled: !!selectedServerId,
    refetchInterval: 5000,
    staleTime: 2000,
  })

  const connectMutation = useMutation({
    mutationFn: ({ mcpName }: { mcpName: string }) => {
      if (!selectedServerId) throw new Error('No server selected')
      return serversApi.connectMcp(selectedServerId, mcpName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-mcp-status', selectedServerId] })
      toast.success('MCP server connected')
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect: ${error.message}`)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: ({ mcpName }: { mcpName: string }) => {
      if (!selectedServerId) throw new Error('No server selected')
      return serversApi.disconnectMcp(selectedServerId, mcpName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-mcp-status', selectedServerId] })
      toast.success('MCP server disconnected')
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })

  const authenticateMutation = useMutation({
    mutationFn: ({ mcpName }: { mcpName: string }) => {
      if (!selectedServerId) throw new Error('No server selected')
      return serversApi.authenticateMcp(selectedServerId, mcpName)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-mcp-status', selectedServerId] })
      toast.success('MCP server authenticated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to authenticate: ${error.message}`)
    },
  })

  const mcpServers = configQuery.data?.config?.mcp ?? {}
  const mcpStatus = mcpStatusQuery.data?.status ?? {}

  return {
    selectedServer,
    selectedServerId,
    
    config: configQuery.data,
    isLoadingConfig: configQuery.isLoading,
    configError: configQuery.error,
    
    mcpServers,
    mcpStatus,
    isLoadingMcpStatus: mcpStatusQuery.isLoading,
    mcpStatusError: mcpStatusQuery.error,
    refetchMcpStatus: mcpStatusQuery.refetch,
    
    connect: (mcpName: string) => connectMutation.mutate({ mcpName }),
    disconnect: (mcpName: string) => disconnectMutation.mutate({ mcpName }),
    authenticate: (mcpName: string) => authenticateMutation.mutate({ mcpName }),
    
    isToggling: connectMutation.isPending || disconnectMutation.isPending || authenticateMutation.isPending,
  }
}
