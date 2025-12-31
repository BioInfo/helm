import { useState } from "react"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ToolCallFeed } from "./ToolCallFeed"
import { useActiveToolCallCount, useMCPStore } from "@/stores/mcpStore"

export function ToolsIndicator() {
  const [open, setOpen] = useState(false)
  const activeCount = useActiveToolCallCount()
  const totalCount = useMCPStore((state) => state.toolCalls.size)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground relative"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Tools</span>
          
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 min-w-4 px-1 bg-yellow-500 text-white text-[10px] font-bold items-center justify-center">
                {activeCount > 9 ? '9+' : activeCount}
              </span>
            </span>
          )}
          
          {activeCount === 0 && totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Tool Calls
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-normal">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                </span>
                {activeCount} active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <ToolCallFeed showHeader={false} maxItems={100} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ToolsIndicator
