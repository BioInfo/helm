import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Circle, Terminal, Server, Folder, MessageSquarePlus, Loader2, Globe, List } from "lucide-react"
import type { OpenCodeServer } from "@/stores/serverStore"
import { findOrCreateRepoForPath } from "@/api/repos"
import { OpenCodeClient } from "@/api/opencode"
import { showToast } from "@/lib/toast"

interface ServerCardProps {
  server: OpenCodeServer
  isSelected: boolean
  onSelect: (serverId: string) => void
}

export function ServerCard({ server, isSelected, onSelect }: ServerCardProps) {
  const navigate = useNavigate()
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const isHealthy = server.status === 'healthy'
  const isTui = server.mode === 'tui'
  const isTerminalOnly = server.mode === 'terminal-only'

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()

    showToast.info(
      `Terminal-only Claude session\nWorking directory: ${server.workdir}\n` +
      `Open this in your terminal to interact with Claude.\n` +
      `Terminal: ${server.projectName}`
    )
  }

  const handleViewSessions = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isHealthy) {
      showToast.error('Cannot view sessions: server is unhealthy')
      return
    }

    setIsNavigating(true)
    try {
      const repo = await findOrCreateRepoForPath(server.workdir, server.isRemote, server.id)
      navigate(`/repos/${repo.id}`)
    } catch (error) {
      console.error('Failed to navigate:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to load sessions')
    } finally {
      setIsNavigating(false)
    }
  }

  const handleStartSession = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isHealthy) {
      showToast.error('Cannot start session: server is unhealthy')
      return
    }

    setIsStartingSession(true)
    try {
      const repo = await findOrCreateRepoForPath(server.workdir, server.isRemote, server.id)
      
      const opcodeUrl = `/api/servers/${server.id}/proxy`
      const client = new OpenCodeClient(opcodeUrl, server.workdir)
      const session = await client.createSession({
        title: `Session - ${new Date().toLocaleTimeString()}`
      })
      
      navigate(`/repos/${repo.id}/sessions/${session.id}`)
    } catch (error) {
      console.error('Failed to start session:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to start session')
    } finally {
      setIsStartingSession(false)
    }
  }

  return (
    <div
      onClick={() => onSelect(server.id)}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-border bg-card hover:border-blue-500/50 hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          {isTui ? (
            <Terminal className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Server className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1 mb-1">
            <h3 className="font-semibold text-sm text-foreground">
              {server.projectName || 'Unknown Project'}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 shrink-0"
              title={
                isTerminalOnly
                  ? "Terminal Only: No HTTP endpoint (TUI mode only)"
                  : isTui
                  ? "TUI mode: CLI running with terminal interface"
                  : "Serve mode: Headless CLI with HTTP endpoint"
              }
            >
              {isTerminalOnly ? 'Terminal Only' : isTui ? 'TUI' : 'serve'}
            </Badge>
            {server.cliType && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 shrink-0"
                title={server.cliType === 'claude' ? 'Claude Code CLI' : 'OpenCode CLI'}
              >
                {server.cliType === 'claude' ? 'Claude' : 'OpenCode'}
              </Badge>
            )}
            {server.isRemote && (
              <Badge 
                variant="outline" 
                className="text-xs px-1.5 py-0 shrink-0 border-blue-500/50 text-blue-400"
                title={`Remote server: ${server.remoteHost}`}
              >
                <Globe className="w-3 h-3 mr-1" />
                remote
              </Badge>
            )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Circle
                className={`w-2 h-2 fill-current ${
                  isTerminalOnly
                    ? 'text-blue-500'
                    : isHealthy
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              />
              {isTerminalOnly ? 'Terminal' : isHealthy ? 'Healthy' : 'Unhealthy'}
            </span>
            {!isTerminalOnly && (
              <span className="text-muted-foreground/60">
                :{server.port}
              </span>
            )}
            {isTerminalOnly && server.startTime && (
              <span className="text-muted-foreground/60">
                Started {server.startTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/80 truncate">
            {server.isRemote ? (
              <>
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{server.remoteHost}:{server.port}</span>
              </>
            ) : (
              <>
                <Folder className="w-3 h-3 shrink-0" />
                <span className="truncate">{server.workdir}</span>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            {isTerminalOnly ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 w-full"
                onClick={handleViewDetails}
              >
                <Terminal className="w-3.5 h-3.5" />
                View Details
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 flex-1"
                  onClick={handleViewSessions}
                  disabled={!isHealthy || isNavigating}
                >
                  {isNavigating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <List className="w-3.5 h-3.5" />
                  )}
                  Sessions
                </Button>
                <Button
                  size="sm"
                  variant={isHealthy ? "default" : "secondary"}
                  className="h-8 text-xs gap-1.5 flex-1"
                  onClick={handleStartSession}
                  disabled={!isHealthy || isStartingSession}
                >
                  {isStartingSession ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                  )}
                  New
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
