# Real-Time Claude Code Session Monitoring

This document describes the real-time session monitoring implementation for Claude Code sessions in Helm.

## Overview

Helm now provides real-time monitoring of Claude Code sessions using Server-Sent Events (SSE) and file system watching. This enables instant updates when sessions are created, modified, or deleted without polling.

## Architecture

### Backend Components

1. **File Watcher (`claude-sessions-watcher.ts`)**
   - Monitors `~/.claude/projects/` directory for changes
   - Watches `sessions-index.json` and `.jsonl` files
   - Debounces rapid changes (500ms)
   - Emits events to all connected SSE clients

2. **SSE Endpoint (`/api/claude-sessions/stream`)**
   - Streams real-time session updates to clients
   - Sends initial session data on connection
   - Pushes updates when sessions change
   - Includes keepalive messages every 30 seconds
   - Handles client disconnections gracefully

3. **REST Endpoint (`/api/claude-sessions/all`)**
   - Backward-compatible REST endpoint
   - Returns all Claude Code sessions
   - Used as fallback if SSE fails

### Frontend Components

1. **SSE Hook (`useClaudeSessionsSSE.ts`)**
   - React hook for consuming SSE stream
   - Manages EventSource connection lifecycle
   - Handles reconnection with exponential backoff
   - Updates React Query cache automatically
   - Max 5 reconnection attempts

2. **Home Page (`Home.tsx`)**
   - Displays real-time session list
   - Shows "Live" indicator when SSE connected
   - Falls back to "Polling" if SSE fails
   - Combines OpenCode and Claude sessions

## Features

### Real-Time Updates

- **Session Created**: Instantly shows new sessions
- **Session Updated**: Reflects changes to existing sessions
- **Session Deleted**: Removes deleted sessions immediately
- **Refresh**: Manual refresh trigger

### Connection Management

- **Auto-Reconnect**: Automatically reconnects on disconnect
- **Keepalive**: Prevents connection timeout (30s interval)
- **Status Indicator**: Visual feedback (green = live, orange = polling)
- **Graceful Degradation**: Falls back to REST polling if SSE fails

## Event Types

```typescript
type SessionChangeType =
  | 'init'              // Initial data on connection
  | 'session-created'   // New session detected
  | 'session-updated'   // Existing session modified
  | 'session-deleted'   // Session removed
  | 'refresh'           // Manual refresh triggered
  | 'keepalive'         // Connection keepalive
```

## Usage

### Starting the Watcher

The watcher starts automatically when the backend initializes:

```typescript
await claudeSessionsWatcher.start()
```

### Frontend Integration

Use the SSE hook in any React component:

```tsx
import { useClaudeSessionsSSE } from '@/hooks/useClaudeSessionsSSE'

function MyComponent() {
  const {
    sessions,        // Real-time session data
    isConnected,     // Connection status
    error,           // Error state
    reconnect        // Manual reconnect function
  } = useClaudeSessionsSSE({
    enabled: true,
    onSessionChange: (type, sessions) => {
      console.log(`Event: ${type}`, sessions)
    }
  })

  return <div>{sessions.length} active sessions</div>
}
```

## Testing

### Backend Tests

```bash
cd backend
pnpm test src/__tests__/claude-sessions-watcher.test.ts
pnpm test src/__tests__/claude-sessions-routes.test.ts
```

### Frontend Tests

```bash
cd frontend
pnpm test src/hooks/__tests__/useClaudeSessionsSSE.test.ts
```

### Manual Testing

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open http://localhost:5003 in your browser

3. Verify "Live" indicator appears in the header

4. Create a new Claude Code session:
   ```bash
   claude
   ```

5. Observe the new session appear instantly in Helm

6. Close the Claude session and verify it's removed in real-time

## Deployment to vibecraft.sh

### Prerequisites

- Node.js 18+ installed
- pnpm installed
- Access to vibecraft.sh server

### Deployment Steps

1. **Build the application:**
   ```bash
   pnpm run build
   ```

2. **Copy files to server:**
   ```bash
   rsync -avz --delete \
     backend/dist/ \
     frontend/dist/ \
     package.json \
     user@vibecraft.sh:/opt/helm/
   ```

3. **Install dependencies on server:**
   ```bash
   ssh user@vibecraft.sh
   cd /opt/helm
   pnpm install --prod
   ```

4. **Start the server:**
   ```bash
   NODE_ENV=production PORT=5003 node backend/dist/index.js
   ```

5. **Configure reverse proxy (nginx):**
   ```nginx
   server {
     listen 80;
     server_name vibecraft.sh;

     location / {
       proxy_pass http://localhost:5003;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }

     # SSE-specific configuration
     location /api/claude-sessions/stream {
       proxy_pass http://localhost:5003;
       proxy_http_version 1.1;
       proxy_set_header Connection '';
       proxy_buffering off;
       proxy_cache off;
       proxy_read_timeout 24h;
       chunked_transfer_encoding off;
     }
   }
   ```

6. **Enable systemd service (optional):**
   ```bash
   sudo systemctl enable helm
   sudo systemctl start helm
   ```

### Environment Variables

- `PORT`: Server port (default: 5003)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (production/development)

## Performance

### Backend

- **File Watcher**: Low CPU overhead, event-based
- **SSE Connections**: ~1KB memory per connection
- **Debouncing**: Prevents excessive updates (500ms)

### Frontend

- **EventSource**: Native browser API, efficient
- **Memory**: Minimal overhead per connection
- **Network**: ~100 bytes per update message

## Troubleshooting

### SSE Connection Fails

1. Check browser console for errors
2. Verify `/api/claude-sessions/stream` endpoint is accessible
3. Check nginx proxy configuration for SSE support
4. Ensure `proxy_buffering off` is set

### Sessions Not Updating

1. Verify file watcher is running: check backend logs
2. Check `~/.claude/projects/` directory permissions
3. Verify sessions-index.json files are being written
4. Check browser Network tab for SSE messages

### High CPU Usage

1. Check for excessive file system changes
2. Increase debounce timeout in watcher
3. Verify no infinite update loops

## Future Enhancements

- [ ] Filter sessions by project/directory
- [ ] Show session activity indicators
- [ ] Display message count in real-time
- [ ] Add session search/filtering
- [ ] Support for remote Claude Code instances
- [ ] Session analytics and metrics
- [ ] WebSocket support as SSE alternative

## API Reference

### SSE Endpoint

**GET** `/api/claude-sessions/stream`

Returns an EventSource stream with the following events:

- `init`: Initial session data
- `session-created`: New session event
- `session-updated`: Session modification event
- `session-deleted`: Session deletion event
- `keepalive`: Connection keepalive ping
- `refresh`: Manual refresh event

**Response Format:**
```typescript
{
  type: SessionChangeType,
  sessions: SessionData[],
  timestamp: number
}
```

### REST Endpoint

**GET** `/api/claude-sessions/all`

Returns all Claude Code sessions.

**Response:**
```typescript
SessionData[]
```

## License

MIT
