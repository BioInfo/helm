import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/ui/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { 
  MessageSquare, 
  Loader2, 
  Search, 
  Server, 
  Clock,
  FolderOpen,
  Plus,
  RefreshCw,
  Database,
  ArrowRight
} from "lucide-react"
import { useServerStore, type OpenCodeServer } from "@/stores/serverStore"
import { findOrCreateRepoForPath } from "@/api/repos"
import { formatDistanceToNow } from "date-fns"
import { ServerIndicator } from "@/components/servers"
import { ToolsIndicator } from "@/components/mcp"
import { TerminalIndicator } from "@/components/terminal"
import { TokenCounter } from "@/components/observability"
import { cn } from "@/lib/utils"

interface SessionInfo {
  id: string
  title: string
  directory: string
  createdAt: number
  updatedAt: number
  server: OpenCodeServer
}

async function fetchSessionsFromServer(server: OpenCodeServer): Promise<SessionInfo[]> {
  if (server.status !== 'healthy') return []
  
  const host = server.isRemote && server.remoteHost ? server.remoteHost : '127.0.0.1'
  const url = `http://${host}:${server.port}/session`
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!response.ok) return []
    
    const sessions = await response.json()
    return sessions.map((s: any) => ({
      id: s.id,
      title: s.title || 'Untitled Session',
      directory: s.directory || server.workdir,
      createdAt: s.createdAt || Date.now(),
      updatedAt: s.updatedAt || s.createdAt || Date.now(),
      server
    }))
  } catch {
    return []
  }
}

export function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const servers = useServerStore((state) => state.servers)
  const refreshServers = useServerStore((state) => state.refresh)
  
  const healthyServers = useMemo(() => 
    servers.filter(s => s.status === 'healthy'),
    [servers]
  )

  const { data: allSessions = [], isLoading, refetch } = useQuery({
    queryKey: ['all-sessions', healthyServers.map(s => s.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        healthyServers.map(server => fetchSessionsFromServer(server))
      )
      return results.flat().sort((a, b) => b.updatedAt - a.updatedAt)
    },
    enabled: healthyServers.length > 0,
    refetchInterval: 30000,
  })

  const filteredSessions = useMemo(() => {
    let sessions = allSessions
    
    if (selectedServerId) {
      sessions = sessions.filter(s => s.server.id === selectedServerId)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      sessions = sessions.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.directory.toLowerCase().includes(query) ||
        s.server.projectName?.toLowerCase().includes(query)
      )
    }
    
    return sessions
  }, [allSessions, selectedServerId, searchQuery])

  const handleSessionClick = async (session: SessionInfo) => {
    try {
      const repo = await findOrCreateRepoForPath(
        session.directory, 
        session.server.isRemote, 
        session.server.id
      )
      navigate(`/repos/${repo.id}/sessions/${session.id}`)
    } catch (error) {
      console.error('Failed to navigate to session:', error)
    }
  }

  const handleNewSession = async (server: OpenCodeServer) => {
    try {
      const repo = await findOrCreateRepoForPath(
        server.workdir, 
        server.isRemote, 
        server.id
      )
      
      const host = server.isRemote && server.remoteHost ? server.remoteHost : '127.0.0.1'
      const response = await fetch(`http://${host}:${server.port}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Session - ${new Date().toLocaleTimeString()}` })
      })
      
      if (response.ok) {
        const session = await response.json()
        navigate(`/repos/${repo.id}/sessions/${session.id}`)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const handleRefresh = () => {
    refreshServers()
    refetch()
  }

  const getProjectName = (path: string) => {
    const parts = path.split('/')
    return parts[parts.length - 1] || path
  }

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-background flex flex-col">
      {/* Header - Fixed */}
      <Header>
        <Header.Title logo>OpenCode</Header.Title>
        <Header.Actions>
          <TokenCounter />
          <ToolsIndicator />
          <TerminalIndicator />
          <ServerIndicator />
          <Header.Settings />
        </Header.Actions>
      </Header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="container max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          
          {/* Controls Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions, projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-muted/30 border-muted-foreground/20 focus:bg-background transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 gap-2 border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/50"
                  onClick={() => navigate("/repos")}
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">Repos</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-muted-foreground/20"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Refresh Servers"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
                {healthyServers.length > 0 && (
                  <Button 
                    className="h-10 gap-2 shadow-lg shadow-primary/20"
                    onClick={() => handleNewSession(healthyServers[0])}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Session</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Server Filter */}
            {healthyServers.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedServerId === null ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedServerId(null)}
                  className="shrink-0 h-8 rounded-full px-4 text-xs font-medium"
                >
                  All Servers
                </Button>
                {healthyServers.map(server => (
                  <Button
                    key={server.id}
                    variant={selectedServerId === server.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedServerId(server.id)}
                    className="shrink-0 h-8 rounded-full px-3 gap-2 text-xs font-medium border border-transparent data-[state=active]:border-border"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      server.status === 'healthy' ? "bg-green-500" : "bg-red-500"
                    )} />
                    {server.projectName || `Port ${server.port}`}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
              {searchQuery ? 'Search Results' : 'Recent Sessions'}
            </h2>

            {servers.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 border-dashed">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Server className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Servers Connected</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6 px-4">
                  OpenCode servers are detected automatically when running on your local network or via tailscale.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => window.open('https://opencode.dev', '_blank')}>
                    Documentation
                  </Button>
                </div>
              </Card>
            ) : healthyServers.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 border-dashed">
                <Loader2 className="w-10 h-10 animate-spin text-primary/50 mb-4" />
                <p className="text-muted-foreground font-medium">Connecting to servers...</p>
              </Card>
            ) : filteredSessions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-16 border-dashed bg-muted/10">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-6">
                  {searchQuery ? 'No matching sessions found' : 'No active sessions'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => handleNewSession(healthyServers[0])}>
                    Start First Session
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map(session => (
                  <Card
                    key={`${session.server.id}-${session.id}`}
                    className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 hover:bg-accent/5 cursor-pointer border-muted-foreground/10"
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-5 flex flex-col h-full relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform duration-300">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <Badge 
                          variant="outline" 
                          className="font-normal text-xs bg-background/50 backdrop-blur-sm"
                        >
                          {session.server.projectName || 'Local'}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-base mb-1 truncate pr-2 group-hover:text-primary transition-colors">
                        {session.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">
                          {getProjectName(session.directory)}
                        </span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                        </div>
                        <ArrowRight className="w-4 h-4 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-primary" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
