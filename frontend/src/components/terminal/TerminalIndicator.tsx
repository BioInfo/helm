import { useState } from 'react'
import { Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TerminalView } from './TerminalView'
import { useSelectedServer } from '@/stores/serverStore'

export function TerminalIndicator() {
  const [open, setOpen] = useState(false)
  const selectedServer = useSelectedServer()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Terminal className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Terminal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95vw] h-[70vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Terminal
            {selectedServer && (
              <span className="text-xs text-muted-foreground font-normal">
                — {selectedServer.projectName || selectedServer.workdir}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 p-2">
          {open && (
            <TerminalView
              serverId={selectedServer?.id}
              workdir={selectedServer?.workdir}
              className="h-full"
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TerminalIndicator
