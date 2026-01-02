import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Circle, Terminal, Server, Folder, MessageSquarePlus, Loader2, Globe } from "lucide-react"
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
  const isHealthy = server.status === 'healthy'
  const isTui = server.mode === 'tui'

  const handleStartSession = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isHealthy) {
      showToast.error('Cannot start session: server is unhealthy')
      return
    }

    setIsStartingSession(true)
    try {
      const repo = await findOrCreateRepoForPath(server.workdir)
      
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {server.projectName || 'Unknown Project'}
            </h3>
            <Badge 
              variant="secondary" 
              className="text-xs px-1.5 py-0 shrink-0"
              title={isTui 
                ? "TUI mode: OpenCode running with terminal interface" 
                : "Serve mode: Headless OpenCode (opencode serve)"
              }
            >
              {isTui ? 'TUI' : 'serve'}
            </Badge>
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

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Circle 
                className={`w-2 h-2 fill-current ${
                  isHealthy ? 'text-green-500' : 'text-red-500'
                }`} 
              />
              {isHealthy ? 'Healthy' : 'Unhealthy'}
            </span>
            <span className="text-muted-foreground/60">
              :{server.port}
            </span>
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

          <Button
            size="sm"
            variant={isHealthy ? "default" : "secondary"}
            className="mt-2 h-8 text-xs gap-1.5 w-full"
            onClick={handleStartSession}
            disabled={!isHealthy || isStartingSession}
          >
            {isStartingSession ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Start Session
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
