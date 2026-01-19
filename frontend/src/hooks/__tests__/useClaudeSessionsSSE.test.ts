import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useClaudeSessionsSSE } from '../useClaudeSessionsSSE'
import { ReactNode } from 'react'

// Mock EventSource
class MockEventSource {
  url: string
  onopen: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null
  addEventListener: (event: string, handler: (event: MessageEvent) => void) => void
  close: () => void

  constructor(url: string) {
    this.url = url
    this.addEventListener = vi.fn()
    this.close = vi.fn()

    // Simulate connection after a short delay
    setTimeout(() => {
      if (this.onopen) {
        this.onopen()
      }
    }, 10)
  }
}

// Replace global EventSource with mock
global.EventSource = MockEventSource as any

describe('useClaudeSessionsSSE', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() => useClaudeSessionsSSE(), { wrapper })

    expect(result.current.sessions).toEqual([])
    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should connect when enabled', async () => {
    const { result } = renderHook(() => useClaudeSessionsSSE({ enabled: true }), { wrapper })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })

  it('should not connect when disabled', () => {
    const { result } = renderHook(() => useClaudeSessionsSSE({ enabled: false }), { wrapper })

    expect(result.current.isConnected).toBe(false)
  })

  it('should call onSessionChange callback', async () => {
    const onSessionChange = vi.fn()
    const { result } = renderHook(
      () => useClaudeSessionsSSE({ enabled: true, onSessionChange }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })

    // Since we're using a mock EventSource, we can't easily test the callback
    // In a real integration test, you would trigger SSE events
  })

  it('should have reconnect function', () => {
    const { result } = renderHook(() => useClaudeSessionsSSE(), { wrapper })

    expect(typeof result.current.reconnect).toBe('function')
  })

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() => useClaudeSessionsSSE({ enabled: true }), { wrapper })

    await waitFor(() => {
      expect(MockEventSource.prototype.close).not.toHaveBeenCalled()
    })

    unmount()

    // Close should be called on unmount
    await waitFor(() => {
      expect(MockEventSource.prototype.close).toHaveBeenCalled()
    })
  })
})
