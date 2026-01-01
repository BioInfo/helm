import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Server, ExternalLink } from 'lucide-react'
import { useServerMcp } from '@/hooks/useServerMcp'
import { useServerStore } from '@/stores/serverStore'

export function ServerMcpViewer() {
  const servers = useServerStore((state) => state.servers)
  const selectedServerId = useServerStore((state) => state.selectedServerId)
  const selectServer = useServerStore((state) => state.selectServer)
  
  const {
    selectedServer,
    mcpServers,
    mcpStatus,
    isLoadingConfig,
    isLoadingMcpStatus,
    configError,
    refetchMcpStatus,
    connect,
    disconnect,
    authenticate,
    isToggling,
  } = useServerMcp()

  if (servers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No OpenCode Servers Found</h3>
          <p className="text-sm text-muted-foreground">
            Start OpenCode in a project directory to see its MCP configuration here.
          </p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
            cd ~/your-project && opencode
          </code>
        </CardContent>
      </Card>
    )
  }

  const mcpServerEntries = Object.entries(mcpServers)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Active Server MCP Servers</h3>
          <p className="text-sm text-muted-foreground">
            MCP servers from the selected OpenCode instance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedServerId || ''}
            onChange={(e) => selectServer(e.target.value || null)}
            className="h-8 px-2 rounded-md border border-input bg-background text-sm"
          >
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.projectName || 'Unknown'} ({server.mode})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => refetchMcpStatus()}
            disabled={isLoadingMcpStatus}
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingMcpStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {selectedServer && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Badge variant={selectedServer.status === 'healthy' ? 'default' : 'destructive'} className="flex items-center gap-1">
            {selectedServer.status === 'healthy' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {selectedServer.status}
          </Badge>
          <span className="text-sm font-medium">{selectedServer.projectName}</span>
          <span className="text-xs text-muted-foreground">@ port {selectedServer.port}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={selectedServer.workdir}>
            {selectedServer.workdir}
          </span>
        </div>
      )}

      {isLoadingConfig && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {configError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to load config: {configError.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoadingConfig && !configError && mcpServerEntries.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              No MCP servers configured in this OpenCode instance.
            </p>
          </CardContent>
        </Card>
      )}

      {mcpServerEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mcpServerEntries.map(([serverId, config]) => {
            const status = mcpStatus[serverId]
            const isConnected = status?.status === 'connected'
            const isFailed = status?.status === 'failed'
            const needsAuth = status?.status === 'needs_auth'
            
            return (
              <Card key={serverId} className={`${isFailed ? 'border-destructive/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                        isConnected ? 'bg-green-500' : 
                        isFailed ? 'bg-destructive' : 
                        needsAuth ? 'bg-yellow-500' : 
                        'bg-muted-foreground'
                      }`} />
                      <h4 className="font-medium text-sm truncate">{serverId}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {config.type || 'local'}
                    </Badge>
                  </div>

                  {config.command && (
                    <p className="text-xs text-muted-foreground font-mono truncate mb-2" title={config.command.join(' ')}>
                      {config.command[0]}
                    </p>
                  )}

                  {config.url && (
                    <p className="text-xs text-muted-foreground truncate mb-2 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {config.url}
                    </p>
                  )}

                  {status?.error && (
                    <p className="text-xs text-destructive mb-2 truncate" title={status.error}>
                      {status.error}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => disconnect(serverId)}
                        disabled={isToggling}
                      >
                        Disconnect
                      </Button>
                    ) : needsAuth ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => authenticate(serverId)}
                        disabled={isToggling}
                      >
                        Authenticate
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => connect(serverId)}
                        disabled={isToggling}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        These MCP servers are inherited from the selected OpenCode instance ({selectedServer?.projectName}).
        Changes made here will affect that instance directly.
      </p>
    </div>
  )
}
