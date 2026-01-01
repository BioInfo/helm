import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Loader2, AlertCircle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import '@xterm/xterm/css/xterm.css'

interface TerminalSession {
  id: string
  workdir: string
  createdAt: number
}

interface TerminalViewProps {
  serverId?: string
  workdir?: string
  className?: string
  onClose?: () => void
}

const API_BASE = '/api/terminal'

export function TerminalView({ serverId, workdir, className, onClose }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const sessionRef = useRef<TerminalSession | null>(null)
  
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const MAX_RECONNECT_ATTEMPTS = 5

  // Unicode-safe base64 encoding (btoa fails with non-ASCII)
  const encodeBase64 = useCallback((str: string): string => {
    const bytes = new TextEncoder().encode(str)
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
    return btoa(binString)
  }, [])

  // Unicode-safe base64 decoding
  const decodeBase64 = useCallback((base64: string): string => {
    const binString = atob(base64)
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!)
    return new TextDecoder().decode(bytes)
  }, [])

  const sendInput = useCallback(async (data: string) => {
    if (!sessionRef.current) return
    
    try {
      const base64Data = encodeBase64(data)
      await fetch(`${API_BASE}/${sessionRef.current.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: base64Data }),
      })
    } catch (err) {
      console.error('Failed to send terminal input:', err)
    }
  }, [encodeBase64])

  const sendResize = useCallback(async (cols: number, rows: number) => {
    if (!sessionRef.current) return
    
    try {
      await fetch(`${API_BASE}/${sessionRef.current.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols, rows }),
      })
    } catch (err) {
      console.error('Failed to resize terminal:', err)
    }
  }, [])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, workdir }),
      })

      if (!response.ok) {
        throw new Error('Failed to create terminal session')
      }

      const session: TerminalSession = await response.json()
      sessionRef.current = session

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`${API_BASE}/${session.id}/stream`)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('connected', () => {
        setStatus('connected')
        reconnectAttemptsRef.current = 0
        setError(null)
        
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit()
          sendResize(terminalRef.current.cols, terminalRef.current.rows)
        }
      })

      eventSource.addEventListener('output', (event) => {
        if (terminalRef.current) {
          const data = decodeBase64(event.data)
          terminalRef.current.write(data)
        }
      })

      const handleConnectionError = () => {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000)
          setStatus('connecting')
          setError(`Reconnecting (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          setStatus('error')
          setError('Connection lost after multiple attempts')
        }
      }

      eventSource.addEventListener('error', handleConnectionError)
      eventSource.onerror = handleConnectionError
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [serverId, workdir, sendResize, decodeBase64])

  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (sessionRef.current) {
      try {
        await fetch(`${API_BASE}/${sessionRef.current.id}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Failed to close terminal session:', err)
      }
      sessionRef.current = null
    }

    setStatus('closed')
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.onData((data) => {
      sendInput(data)
    })

    terminal.onResize(({ cols, rows }) => {
      sendResize(cols, rows)
    })

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }

    window.addEventListener('resize', handleResize)

    connect()

    return () => {
      window.removeEventListener('resize', handleResize)
      disconnect()
      terminal.dispose()
    }
  }, [connect, disconnect, sendInput, sendResize])

  useEffect(() => {
    if (status === 'connected' && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit()
      }, 100)
    }
  }, [status])

  return (
    <div className={cn("flex flex-col bg-[#1a1b26] rounded-lg overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-2 bg-[#24283b] border-b border-[#414868]">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            status === 'connected' ? "bg-green-500" :
            status === 'connecting' ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          )} />
          <span className="text-xs text-[#a9b1d6] font-mono">
            {sessionRef.current?.workdir || workdir || 'Terminal'}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {status === 'error' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#a9b1d6] hover:text-[#c0caf5] hover:bg-[#414868]"
              onClick={connect}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#a9b1d6] hover:text-[#c0caf5] hover:bg-[#414868]"
              onClick={() => {
                disconnect()
                onClose()
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[200px]">
        <div 
          ref={containerRef} 
          className="absolute inset-0 p-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
        />
        
        {status === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1b26]/90">
            <div className="flex items-center gap-2 text-[#a9b1d6]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1b26]/90">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="text-[#a9b1d6]">{error || 'Connection error'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={connect}
                className="border-[#414868] text-[#a9b1d6] hover:bg-[#414868]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TerminalView
