import { Badge } from "@/components/ui/badge"
import { Circle, Terminal, Server, Folder } from "lucide-react"
import type { OpenCodeServer } from "@/stores/serverStore"

interface ServerCardProps {
  server: OpenCodeServer
  isSelected: boolean
  onSelect: (serverId: string) => void
}

export function ServerCard({ server, isSelected, onSelect }: ServerCardProps) {
  const isHealthy = server.status === 'healthy'
  const isTui = server.mode === 'tui'

  return (
    <button
      onClick={() => onSelect(server.id)}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 active:scale-[0.98] ${
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
            <Folder className="w-3 h-3 shrink-0" />
            <span className="truncate">{server.workdir}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
