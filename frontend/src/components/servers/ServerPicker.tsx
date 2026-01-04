import { useEffect, useCallback } from "react"
import { RefreshCw, ServerOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ServerCard } from "./ServerCard"
import { useServerStore, useSelectedServer } from "@/stores/serverStore"

interface ServerPickerProps {
  onServerSelect?: (serverId: string) => void
}

export function ServerPicker({ onServerSelect }: ServerPickerProps) {
  const { 
    servers, 
    selectedServerId, 
    isLoading, 
    error, 
    setServers, 
    selectServer, 
    setLoading, 
    setError 
  } = useServerStore()
  
  const selectedServer = useSelectedServer()

  const fetchServers = useCallback(async (refresh = false) => {
    setLoading(true)
    try {
      const endpoint = refresh ? '/api/servers/refresh' : '/api/servers'
      const method = refresh ? 'POST' : 'GET'
      const response = await fetch(endpoint, { method })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.statusText}`)
      }
      
      const data = await response.json()
      setServers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers')
    }
  }, [setLoading, setServers, setError])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const handleServerSelect = (serverId: string) => {
    selectServer(serverId)
    onServerSelect?.(serverId)
  }

  const handleRefresh = () => {
    fetchServers(true)
  }

  if (error && servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <ServerOff className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h2 className="font-semibold text-sm">OpenCode Servers</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {isLoading && servers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <ServerOff className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No OpenCode servers found</p>
            <div className="text-xs text-muted-foreground/70 mt-2 space-y-1.5 max-w-[280px]">
              <p>
                Helm discovers running OpenCode instances via <code className="px-1 py-0.5 bg-muted rounded text-[10px]">lsof</code>.
              </p>
              <p>
                Start OpenCode in any project directory:
              </p>
              <code className="block px-2 py-1.5 bg-muted rounded text-[10px] font-mono">
                cd ~/your-project && opencode
              </code>
              <p className="text-muted-foreground/50 pt-1">
                Discovery refreshes every ~5 seconds
              </p>
            </div>
          </div>
        ) : (
          servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              isSelected={server.id === selectedServerId}
              onSelect={handleServerSelect}
            />
          ))
        )}
      </div>

      {selectedServer && (
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Connected to <span className="font-medium text-foreground">{selectedServer.projectName}</span>
            <span className="text-muted-foreground/60"> on port {selectedServer.port}</span>
          </p>
        </div>
      )}
    </div>
  )
}
