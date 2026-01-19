import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClaudeSessionsWatcher } from '../claude-sessions-watcher'
import type { SessionChangeEvent } from '../claude-sessions-watcher'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ClaudeSessionsWatcher', () => {
  let watcher: ClaudeSessionsWatcher
  let testDir: string

  beforeEach(async () => {
    watcher = new ClaudeSessionsWatcher()
    testDir = join(tmpdir(), `claude-sessions-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await watcher.stop()
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should start and stop the watcher', async () => {
    await watcher.start()
    expect(watcher.getListenerCount()).toBe(0)
    await watcher.stop()
  })

  it('should add and remove listeners', async () => {
    const listener = vi.fn()
    watcher.addListener(listener)
    expect(watcher.getListenerCount()).toBe(1)

    watcher.removeListener(listener)
    expect(watcher.getListenerCount()).toBe(0)
  })

  it('should emit events to listeners', async () => {
    const listener = vi.fn()
    watcher.addListener(listener)

    const mockEvent: SessionChangeEvent = {
      type: 'session-created',
      projects: [],
      timestamp: Date.now()
    }

    // Manually trigger emit for testing
    await watcher.refresh()

    // Listener should be called at least once (from refresh)
    expect(listener).toHaveBeenCalled()
  })

  it('should get current sessions', async () => {
    const sessions = await watcher.getCurrentSessions()
    expect(Array.isArray(sessions)).toBe(true)
  })

  it('should handle multiple listeners', async () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const listener3 = vi.fn()

    watcher.addListener(listener1)
    watcher.addListener(listener2)
    watcher.addListener(listener3)

    expect(watcher.getListenerCount()).toBe(3)

    await watcher.refresh()

    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
    expect(listener3).toHaveBeenCalled()
  })

  it('should not fail when listener throws error', async () => {
    const goodListener = vi.fn()
    const badListener = vi.fn(() => {
      throw new Error('Listener error')
    })

    watcher.addListener(badListener)
    watcher.addListener(goodListener)

    // Should not throw
    await expect(watcher.refresh()).resolves.not.toThrow()

    // Good listener should still be called
    expect(goodListener).toHaveBeenCalled()
  })
})
