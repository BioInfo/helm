import { useState } from "react"
import { Server, ChevronDown, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ServerPicker } from "./ServerPicker"
import { useSelectedServer, useServerStore } from "@/stores/serverStore"
import { useServerDiscovery } from "@/hooks/useServerDiscovery"

export function ServerIndicator() {
  const [open, setOpen] = useState(false)
  const selectedServer = useSelectedServer()
  const { servers } = useServerStore()
  
  useServerDiscovery()
  
  const healthyCount = servers.filter(s => s.status === 'healthy').length
  const totalCount = servers.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Server className="w-4 h-4" />
          {selectedServer ? (
            <>
              <span className="hidden sm:inline max-w-[100px] truncate text-xs">
                {selectedServer.projectName || 'Unknown'}
              </span>
              <Circle 
                className={`w-2 h-2 fill-current ${
                  selectedServer.status === 'healthy' ? 'text-green-500' : 'text-red-500'
                }`} 
              />
            </>
          ) : (
            <span className="text-xs">
              {totalCount > 0 ? `${healthyCount}/${totalCount}` : 'No servers'}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-0 max-h-[80vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Select OpenCode Server</DialogTitle>
        </DialogHeader>
        <ServerPicker onServerSelect={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
