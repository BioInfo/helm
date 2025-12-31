import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, Copy, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MCPToolCall } from '@/stores/mcpStore'
import { cn } from '@/lib/utils'

interface ToolCallDetailProps {
  call: MCPToolCall | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function CopyButton({ content, label }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-accent hover:bg-accent/80 transition-colors min-h-[32px]"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label || 'Copy'}</span>
        </>
      )}
    </button>
  )
}

function StatusBadge({ status }: { status: MCPToolCall['status'] }) {
  const config = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
    },
    running: {
      icon: Loader2,
      label: 'Running',
      className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    },
    completed: {
      icon: CheckCircle2,
      label: 'Completed',
      className: 'bg-green-500/20 text-green-600 dark:text-green-400'
    },
    error: {
      icon: XCircle,
      label: 'Error',
      className: 'bg-red-500/20 text-red-600 dark:text-red-400'
    }
  }
  
  const { icon: Icon, label, className } = config[status]
  const isAnimated = status === 'running' || status === 'pending'
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", className)}>
      <Icon className={cn("w-3.5 h-3.5", isAnimated && "animate-spin")} />
      {label}
    </span>
  )
}

export function ToolCallDetail({ call, open, onOpenChange }: ToolCallDetailProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input')
  
  if (!call) return null

  const inputJson = JSON.stringify(call.input, null, 2)
  const outputContent = call.status === 'completed' ? call.output : call.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono">{call.toolName}</span>
              <StatusBadge status={call.status} />
            </DialogTitle>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {call.startTime && (
              <span>Started: {formatDate(call.startTime)}</span>
            )}
            {call.duration !== undefined && (
              <span>Duration: {formatDuration(call.duration)}</span>
            )}
            {call.sessionId && (
              <span>Session: <code className="bg-accent px-1 rounded">{call.sessionId.slice(0, 12)}...</code></span>
            )}
          </div>
        </DialogHeader>

        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setActiveTab('input')}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              activeTab === 'input'
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Input
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              activeTab === 'output'
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
              !outputContent && "opacity-50"
            )}
            disabled={!outputContent}
          >
            {call.status === 'error' ? 'Error' : 'Output'}
            {call.status === 'running' && (
              <Loader2 className="w-3 h-3 ml-1.5 inline animate-spin" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === 'input' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">JSON Input</span>
                <CopyButton content={inputJson} />
              </div>
              <pre className="bg-accent p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                {inputJson}
              </pre>
            </div>
          )}

          {activeTab === 'output' && outputContent && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-xs font-medium",
                  call.status === 'error' ? "text-red-500" : "text-muted-foreground"
                )}>
                  {call.status === 'error' ? 'Error Message' : 'Output'}
                </span>
                <CopyButton content={outputContent} />
              </div>
              <pre className={cn(
                "p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono",
                call.status === 'error' 
                  ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                  : "bg-accent"
              )}>
                {outputContent}
              </pre>
            </div>
          )}

          {activeTab === 'output' && !outputContent && (
            <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
              {call.status === 'running' || call.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for output...</span>
                </div>
              ) : (
                <span>No output available</span>
              )}
            </div>
          )}
        </div>

        {call.title && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex-shrink-0">
            <span className="font-medium">Title:</span> {call.title}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ToolCallDetail
