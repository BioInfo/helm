import { readdir, readFile, stat, watch } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import { logger } from './utils/logger'

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

export interface ClaudeSession {
  sessionId: string
  projectPath: string
  firstPrompt: string
  messageCount: number
  created: string
  modified: string
  gitBranch?: string
  isSidechain: boolean
}

export interface ClaudeProject {
  encodedPath: string
  projectPath: string
  sessions: ClaudeSession[]
}

function encodeProjectPath(path: string): string {
  return '-' + path.replace(/\//g, '-')
}

export async function discoverClaudeSessions(): Promise<ClaudeProject[]> {
  try {
    const projects: ClaudeProject[] = []
    const dirs = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })

    for (const dir of dirs) {
      if (!dir.isDirectory() || !dir.name.startsWith('-')) continue

      const projectDir = join(CLAUDE_PROJECTS_DIR, dir.name)
      const indexPath = join(projectDir, 'sessions-index.json')

      try {
        const indexData = await readFile(indexPath, 'utf-8')
        const index = JSON.parse(indexData)

        if (index.entries && Array.isArray(index.entries)) {
          const firstEntry = index.entries[0]
          const projectPath = firstEntry?.projectPath || dir.name.slice(1).replace(/-/g, '/')

          projects.push({
            encodedPath: dir.name,
            projectPath,
            sessions: index.entries.map((entry: any) => ({
              sessionId: entry.sessionId,
              projectPath: entry.projectPath || projectPath,
              firstPrompt: entry.firstPrompt || 'Untitled Session',
              messageCount: entry.messageCount || 0,
              created: entry.created,
              modified: entry.modified,
              gitBranch: entry.gitBranch,
              isSidechain: entry.isSidechain || false,
            }))
          })
        }
      } catch (err) {
        logger.warn(`Failed to read Claude sessions for ${dir.name}:`, err)
      }
    }

    return projects
  } catch (err) {
    logger.error('Failed to discover Claude sessions:', err)
    return []
  }
}

export async function readClaudeSessionMessages(projectPath: string, sessionId: string): Promise<any[]> {
  try {
    const encodedPath = encodeProjectPath(projectPath)
    const sessionFile = join(CLAUDE_PROJECTS_DIR, encodedPath, `${sessionId}.jsonl`)
    
    const content = await readFile(sessionFile, 'utf-8')
    const lines = content.trim().split('\n')
    
    return lines.map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)
  } catch (err) {
    logger.error(`Failed to read Claude session ${sessionId}:`, err)
    return []
  }
}
