import { useState } from "react"
import { Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  useSessionCost,
  useSessionTokens,
  useTotalCost,
  useObservabilityStore,
  formatCost,
  formatTokens,
} from "@/stores/observabilityStore"
import { cn } from "@/lib/utils"

interface TokenCounterProps {
  sessionId?: string
  className?: string
}

export function TokenCounter({ sessionId, className }: TokenCounterProps) {
  const [open, setOpen] = useState(false)
  const sessionCost = useSessionCost(sessionId)
  const sessionTokens = useSessionTokens(sessionId)
  const totalCost = useTotalCost()
  const sessionUsage = useObservabilityStore((state) => state.sessionUsage)
  const clearAllUsage = useObservabilityStore((state) => state.clearAllUsage)

  const totalTokens = sessionTokens.input + sessionTokens.output + sessionTokens.reasoning

  const hasUsage = totalTokens > 0 || sessionCost > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <Coins className="w-4 h-4" />
          {hasUsage ? (
            <span className="text-xs tabular-nums">
              {formatCost(sessionCost)}
            </span>
          ) : (
            <span className="hidden sm:inline text-xs">Cost</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            Usage & Cost
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {sessionId && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium mb-3">Current Session</h3>
              <div className="grid grid-cols-2 gap-3">
                <UsageStat label="Cost" value={formatCost(sessionCost)} />
                <UsageStat label="Total Tokens" value={formatTokens(totalTokens)} />
                <UsageStat label="Input" value={formatTokens(sessionTokens.input)} />
                <UsageStat label="Output" value={formatTokens(sessionTokens.output)} />
                {sessionTokens.reasoning > 0 && (
                  <UsageStat label="Reasoning" value={formatTokens(sessionTokens.reasoning)} />
                )}
                {(sessionTokens.cacheRead > 0 || sessionTokens.cacheWrite > 0) && (
                  <>
                    <UsageStat label="Cache Read" value={formatTokens(sessionTokens.cacheRead)} />
                    <UsageStat label="Cache Write" value={formatTokens(sessionTokens.cacheWrite)} />
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">All Sessions</h3>
              <span className="text-xs text-muted-foreground">
                {sessionUsage.size} session{sessionUsage.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCost(totalCost)}
              </span>
            </div>
          </div>

          {sessionUsage.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                clearAllUsage()
                setOpen(false)
              }}
            >
              Clear Usage History
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}

export default TokenCounter
