import { useState, useMemo } from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, Wrench, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useMCPStore, useActiveToolCallCount, type MCPToolCall } from '@/stores/mcpStore'
import { cn } from '@/lib/utils'

interface ToolCallItemProps {
  call: MCPToolCall
  isExpanded: boolean
  onToggle: () => void
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  })
}

function CopyButton({ content, className }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1 rounded hover:bg-accent transition-colors",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

function ToolCallItem({ call, isExpanded, onToggle }: ToolCallItemProps) {
  const getStatusIcon = () => {
    switch (call.status) {
      case 'running':
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = () => {
    if (call.status === 'running' || call.status === 'pending') {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
          </span>
          Running
        </span>
      )
    }
    
    if (call.duration !== undefined) {
      return (
        <span className="text-xs text-muted-foreground">
          {formatDuration(call.duration)}
        </span>
      )
    }
    
    return null
  }

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden transition-all",
        call.status === 'running' || call.status === 'pending' 
          ? "border-yellow-500/50 shadow-sm shadow-yellow-500/10" 
          : call.status === 'error'
          ? "border-red-500/30"
          : "border-border"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 bg-card hover:bg-card-hover text-left flex items-center gap-2 min-h-[44px]"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        
        {getStatusIcon()}
        
        <span className="font-medium text-sm truncate">{call.toolName}</span>
        
        {call.title && (
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {call.title}
          </span>
        )}
        
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {getStatusBadge()}
          {call.startTime && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {formatTime(call.startTime)}
            </span>
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="bg-card border-t border-border p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Input</span>
              <CopyButton content={JSON.stringify(call.input, null, 2)} />
            </div>
            <pre className="bg-accent p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-48">
              {JSON.stringify(call.input, null, 2)}
            </pre>
          </div>
          
          {call.status === 'completed' && call.output && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Output</span>
                <CopyButton content={call.output} />
              </div>
              <pre className="bg-accent p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-64">
                {call.output.length > 2000 ? `${call.output.slice(0, 2000)}...` : call.output}
              </pre>
            </div>
          )}
          
          {call.status === 'error' && call.error && (
            <div>
              <span className="text-xs font-medium text-red-500 mb-1 block">Error</span>
              <pre className="bg-red-500/10 p-2 rounded text-xs text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap break-words">
                {call.error}
              </pre>
            </div>
          )}
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {call.sessionId && (
              <span>Session: <code className="bg-accent px-1 rounded">{call.sessionId.slice(0, 8)}...</code></span>
            )}
            {call.duration !== undefined && (
              <span>Duration: {formatDuration(call.duration)}</span>
            )}
            {call.startTime && (
              <span>Started: {formatTime(call.startTime)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ToolCallFeedProps {
  sessionId?: string
  maxItems?: number
  showHeader?: boolean
  className?: string
}

export function ToolCallFeed({ 
  sessionId, 
  maxItems = 50,
  showHeader = true,
  className 
}: ToolCallFeedProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const activeCount = useActiveToolCallCount()
  
  // Use useShallow to prevent infinite re-renders from array reference changes
  const toolCallsMap = useMCPStore(useShallow((state) => state.toolCalls))
  
  // Derive and sort calls in useMemo to maintain stable references
  const calls = useMemo(() => {
    const allCalls = Array.from(toolCallsMap.values())
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    
    if (sessionId) {
      return allCalls.filter(c => c.sessionId === sessionId).slice(0, maxItems)
    }
    return allCalls.slice(0, maxItems)
  }, [toolCallsMap, sessionId, maxItems])

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (calls.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Wrench className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-1">No Tool Calls</h3>
        <p className="text-sm text-muted-foreground/70">
          Tool calls will appear here as they're executed
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {showHeader && (
        <div className="flex items-center justify-between px-1 py-2 border-b border-border mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Tool Calls</h2>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                </span>
                {activeCount} active
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {calls.length} call{calls.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      <div className="space-y-2 overflow-y-auto">
        {calls.map((call) => (
          <ToolCallItem
            key={call.id}
            call={call}
            isExpanded={expandedIds.has(call.id)}
            onToggle={() => toggleExpanded(call.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default ToolCallFeed
