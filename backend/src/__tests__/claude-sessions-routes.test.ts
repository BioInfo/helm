import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import claudeSessionsRoutes from '../routes/claude-sessions'

describe('Claude Sessions Routes', () => {
  let app: Hono

  beforeAll(() => {
    app = new Hono()
    app.route('/api/claude-sessions', claudeSessionsRoutes)
  })

  it('should return sessions from /all endpoint', async () => {
    const res = await app.request('/api/claude-sessions/all')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should handle SSE stream connection', async () => {
    const res = await app.request('/api/claude-sessions/stream')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })

  it('should return 404 for non-existent project', async () => {
    const res = await app.request('/api/claude-sessions/project/non-existent-project')
    expect(res.status).toBe(404)
  })

  it('should require projectPath for session messages', async () => {
    const res = await app.request('/api/claude-sessions/session/test-session-id/messages')
    expect(res.status).toBe(400)
  })
})
