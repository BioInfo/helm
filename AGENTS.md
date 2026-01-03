# AGENTS.md - Helm Development Context

> **Helm** — Unified OpenCode command center. Take the helm from anywhere.

## Project Overview

**Repository:** `github.com/BioInfo/helm`  
**Base:** Fork of `github.com/chriswritescode-dev/opencode-web`  
**Purpose:** Mobile-first interface for managing multiple OpenCode instances  
**Primary Use Case:** Remote coding orchestration via Tailscale  

## Quick Start

```bash
git clone https://github.com/BioInfo/helm.git
cd helm
pnpm install
pnpm dev

# Frontend: http://localhost:5173
# Backend API: http://localhost:5001
```

## Architecture

```
Browser → Helm Frontend (React) → Helm Backend (Hono) → OpenCode Instances
                                        │
                                        ├── Discovery (lsof)
                                        ├── Proxy (sessions)
                                        └── Terminal (PTY)
```

### Directory Structure

```
helm/
├── frontend/           # React 19 + Vite + Tailwind
│   └── src/
│       ├── api/        # API clients, OpenCode types
│       ├── components/ # UI components (shadcn/ui based)
│       │   ├── message/    # Chat message rendering
│       │   ├── session/    # Session management
│       │   ├── terminal/   # Xterm.js terminal
│       │   ├── servers/    # Server discovery UI
│       │   └── mcp/        # MCP tool visibility
│       ├── hooks/      # React hooks
│       ├── stores/     # Zustand state stores
│       └── lib/        # Utilities
├── backend/            # Hono + Node.js server
│   └── src/
│       ├── routes/     # API endpoints
│       ├── services/   # Business logic
│       └── db/         # SQLite (better-sqlite3)
├── shared/             # Shared types and config
└── docs/               # Documentation
```

## Key Features (Implemented)

| Feature | Location | Notes |
|---------|----------|-------|
| Multi-server discovery | `backend/src/discovery.ts` | Uses lsof to find OpenCode processes |
| Server switching | `frontend/src/components/servers/` | UI for switching between instances |
| Embedded terminal | `frontend/src/components/terminal/` | Xterm.js + WebGL renderer |
| MCP tool visibility | `frontend/src/components/mcp/` | Real-time tool call monitoring |
| Session management | `frontend/src/components/session/` | List, rename, delete sessions |
| File browser | `frontend/src/components/file-browser/` | Browse and edit files |
| Git integration | `frontend/src/api/git.ts` | Status, diff, branches |
| Offline support | `frontend/src/hooks/useOfflineSync.ts` | IndexedDB caching |

## Tech Stack

### Frontend
- React 19 with hooks
- Vite 7 for bundling
- Tailwind CSS 4 for styling
- Zustand for state management
- React Query for server state
- shadcn/ui components
- Xterm.js with WebGL addon

### Backend
- Hono web framework
- Node.js runtime (tsx for dev)
- SQLite via better-sqlite3
- node-pty for terminal

## Code Style

1. **TypeScript Strict** — No `any`, complete types
2. **Functional Components** — Hooks only, no classes
3. **Zustand for Global State** — Keep stores small and focused
4. **React Query for Server State** — Caching, refetching
5. **Tailwind for Styling** — Utility-first, dark mode via class
6. **44px Touch Targets** — Minimum for interactive elements
7. **Safe Area Handling** — Use `env(safe-area-inset-*)` for iOS

## API Endpoints

### Backend API (`/api/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/servers` | GET | List discovered OpenCode instances |
| `/api/repos` | GET/POST | Repository management |
| `/api/repos/:id/git/*` | GET | Git operations |
| `/api/terminal/create` | POST | Create terminal session |
| `/api/terminal/:id/stream` | SSE | Terminal output stream |
| `/api/settings` | GET/PATCH | App settings |
| `/api/health` | GET | Health check |

### OpenCode Proxy (`/api/opencode/`)

All requests to `/api/opencode/*` are proxied to the OpenCode server.

## Environment Variables

See `.env.example` for all options. Key variables:

```bash
PORT=5001              # Backend port
HOST=0.0.0.0           # Bind address
OPENCODE_SERVER_PORT=5551  # Internal OpenCode port
WORKSPACE_PATH=./workspace # Data directory
```

## Development Commands

```bash
pnpm dev              # Start both frontend and backend
pnpm dev:frontend     # Frontend only (port 5173)
pnpm dev:backend      # Backend only (port 5001)
pnpm build            # Production build
pnpm test             # Run tests
```

## Testing Checklist

Before submitting PRs:

- [ ] Works on mobile Safari (iPhone)
- [ ] Works on desktop Chrome
- [ ] Dark mode renders correctly
- [ ] Touch targets >= 44px
- [ ] No TypeScript errors (`pnpm --filter frontend build`)
- [ ] No console errors in browser
- [ ] Terminal renders fonts correctly

## Common Tasks

### Adding a new API endpoint

1. Create route in `backend/src/routes/`
2. Register in `backend/src/index.ts`
3. Add types in `shared/src/schemas/`
4. Create React Query hook in `frontend/src/hooks/`

### Adding a new UI component

1. Create in `frontend/src/components/`
2. Use existing shadcn/ui primitives from `frontend/src/components/ui/`
3. Follow existing patterns for dark mode support
4. Test on mobile viewport

### Modifying OpenCode integration

1. Check `frontend/src/api/opencode.ts` for client
2. Types in `frontend/src/api/opencode-types.ts`
3. Proxy logic in `backend/src/services/proxy.ts`

## Resources

- [OpenCode](https://opencode.ai) — The AI coding agent
- [opencode-web](https://github.com/chriswritescode-dev/opencode-web) — Base project
- [Xterm.js](https://xtermjs.org) — Terminal emulator
- [Hono](https://hono.dev) — Web framework
- [shadcn/ui](https://ui.shadcn.com) — UI components
