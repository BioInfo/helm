import { watch } from 'fs/promises'
import type { FSWatcher } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { logger } from './utils/logger'
import { discoverClaudeSessions } from './claude-sessions'
import type { ClaudeProject } from './claude-sessions'

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

export type SessionChangeType = 'session-updated' | 'session-created' | 'session-deleted' | 'refresh'

export interface SessionChangeEvent {
  type: SessionChangeType
  projects: ClaudeProject[]
  timestamp: number
}

export class ClaudeSessionsWatcher {
  private watchers: FSWatcher[] = []
  private listeners: Set<(event: SessionChangeEvent) => void> = new Set()
  private debounceTimer: NodeJS.Timeout | null = null
  private isWatching = false
  private lastProjects: ClaudeProject[] = []

  constructor() {
    // Bind methods to maintain context
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.addListener = this.addListener.bind(this)
    this.removeListener = this.removeListener.bind(this)
  }

  /**
   * Start watching for Claude session changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn('Claude sessions watcher already started')
      return
    }

    try {
      logger.info(`Starting Claude sessions watcher on: ${CLAUDE_PROJECTS_DIR}`)

      // Initial discovery
      this.lastProjects = await discoverClaudeSessions()

      // Watch the projects directory for new/removed projects
      const projectsDirWatcher = watch(CLAUDE_PROJECTS_DIR, { recursive: false })
      this.isWatching = true

      // Start watching in background
      ;(async () => {
        try {
          for await (const event of projectsDirWatcher) {
            this.handleFileChange(event.eventType, event.filename)
          }
        } catch (err) {
          if (this.isWatching) {
            logger.error('Projects dir watcher error:', err)
          }
        }
      })()

      // Watch each project's sessions-index.json and .jsonl files
      const projectDirs = this.lastProjects.map(p => join(CLAUDE_PROJECTS_DIR, p.encodedPath))
      for (const projectDir of projectDirs) {
        try {
          const projectWatcher = watch(projectDir, { recursive: false })

          // Start watching in background
          ;(async () => {
            try {
              for await (const event of projectWatcher) {
                this.handleFileChange(event.eventType, event.filename)
              }
            } catch (err) {
              if (this.isWatching) {
                logger.error(`Project watcher error for ${projectDir}:`, err)
              }
            }
          })()
        } catch (err) {
          logger.warn(`Failed to watch project directory ${projectDir}:`, err)
        }
      }

      logger.info('Claude sessions watcher started successfully')
    } catch (err) {
      logger.error('Failed to start Claude sessions watcher:', err)
      this.isWatching = false
    }
  }

  /**
   * Stop watching for changes
   */
  async stop(): Promise<void> {
    if (!this.isWatching) return

    logger.info('Stopping Claude sessions watcher')
    this.isWatching = false

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Note: fs.watch() returns an AsyncIterable, so we can't explicitly close it
    // It will be garbage collected when the async iteration stops
    this.watchers = []

    logger.info('Claude sessions watcher stopped')
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleFileChange(eventType: string, filename: string | null): void {
    if (!filename) return

    // Only care about sessions-index.json and .jsonl files
    if (!filename.endsWith('sessions-index.json') && !filename.endsWith('.jsonl')) {
      return
    }

    // Debounce rapid changes (e.g., when a session is being actively written)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const currentProjects = await discoverClaudeSessions()

        // Determine change type
        let changeType: SessionChangeType = 'session-updated'

        const prevCount = this.lastProjects.reduce((sum, p) => sum + p.sessions.length, 0)
        const currCount = currentProjects.reduce((sum, p) => sum + p.sessions.length, 0)

        if (currCount > prevCount) {
          changeType = 'session-created'
        } else if (currCount < prevCount) {
          changeType = 'session-deleted'
        }

        this.lastProjects = currentProjects

        // Emit change event
        const event: SessionChangeEvent = {
          type: changeType,
          projects: currentProjects,
          timestamp: Date.now()
        }

        this.emit(event)
      } catch (err) {
        logger.error('Error handling file change:', err)
      }
    }, 500) // 500ms debounce
  }

  /**
   * Add a listener for session changes
   */
  addListener(callback: (event: SessionChangeEvent) => void): void {
    this.listeners.add(callback)
  }

  /**
   * Remove a listener
   */
  removeListener(callback: (event: SessionChangeEvent) => void): void {
    this.listeners.delete(callback)
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: SessionChangeEvent): void {
    logger.debug(`Emitting session change event: ${event.type}`, {
      projectCount: event.projects.length,
      sessionCount: event.projects.reduce((sum, p) => sum + p.sessions.length, 0)
    })

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        logger.error('Error in session change listener:', err)
      }
    }
  }

  /**
   * Get current session data (for new SSE connections)
   */
  async getCurrentSessions(): Promise<ClaudeProject[]> {
    return this.lastProjects.length > 0
      ? this.lastProjects
      : await discoverClaudeSessions()
  }

  /**
   * Manually trigger a refresh
   */
  async refresh(): Promise<void> {
    try {
      const projects = await discoverClaudeSessions()
      this.lastProjects = projects

      const event: SessionChangeEvent = {
        type: 'refresh',
        projects,
        timestamp: Date.now()
      }

      this.emit(event)
    } catch (err) {
      logger.error('Error refreshing sessions:', err)
    }
  }

  /**
   * Get the number of active listeners
   */
  getListenerCount(): number {
    return this.listeners.size
  }
}

// Singleton instance
export const claudeSessionsWatcher = new ClaudeSessionsWatcher()
