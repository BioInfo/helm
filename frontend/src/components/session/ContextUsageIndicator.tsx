import { useContextUsage } from '@/hooks/useContextUsage'
import { getModel, formatModelName } from '@/api/providers'
import { useState, useEffect } from 'react'
import { useSessionCost, formatCost } from '@/stores/observabilityStore'
import { getPendingMessages } from '@/lib/offline/db'
import { WifiOff } from 'lucide-react'

interface ContextUsageIndicatorProps {
  opcodeUrl: string | null
  sessionID: string | undefined
  directory?: string
  isConnected: boolean
  isReconnecting?: boolean
}

export function ContextUsageIndicator({ opcodeUrl, sessionID, directory, isConnected, isReconnecting }: ContextUsageIndicatorProps) {
  const { totalTokens, contextLimit, usagePercentage, currentModel, isLoading } = useContextUsage(opcodeUrl, sessionID, directory)
  const sessionCost = useSessionCost(sessionID)
  const [modelName, setModelName] = useState<string>('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const loadModelName = async () => {
      if (currentModel) {
        try {
          const [providerId, modelId] = currentModel.split('/')
          if (providerId && modelId) {
            const model = await getModel(providerId, modelId)
            if (model) {
              setModelName(formatModelName(model))
            } else {
              setModelName(currentModel)
            }
          } else {
            setModelName(currentModel)
          }
        } catch {
          setModelName(currentModel)
        }
      } else {
        setModelName('')
      }
    }

    loadModelName()
  }, [currentModel])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const loadPendingCount = async () => {
      if (sessionID) {
        const pending = await getPendingMessages(sessionID)
        setPendingCount(pending.length)
      }
    }
    
    loadPendingCount()
    const interval = setInterval(loadPendingCount, 5000)
    return () => clearInterval(interval)
  }, [sessionID])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (isReconnecting) {
    return <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Reconnecting...</span>
  }

  if (!isConnected) {
    if (isOffline) {
      return (
        <div className="flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Offline
            {pendingCount > 0 && ` (${pendingCount} queued)`}
          </span>
        </div>
      )
    }
    return <span className="text-xs text-muted-foreground font-medium">Disconnected</span>
  }

  if (!modelName) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">No model</span>
      </div>
    )
  }

  const getUsageTextColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-700 dark:text-green-400'
    if (percentage < 80) return 'text-yellow-700 dark:text-yellow-400'
    return 'text-red-700 dark:text-red-400'
  }

  if (isReconnecting) {
    return null
  }

  if (!contextLimit) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{modelName}</span>
        {sessionCost > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCost(sessionCost)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-medium whitespace-nowrap ${getUsageTextColor(usagePercentage || 0)}`}>
          {totalTokens.toLocaleString()} / {contextLimit.toLocaleString()}
        </span>
        {sessionCost > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCost(sessionCost)}
          </span>
        )}
      </div>
    </div>
  )
}