# AGENTS.md - Helm Development Context

> **Helm** — Unified OpenCode command center. Take the helm from anywhere.

## Project Overview

**Repository:** `github.com/BioInfo/helm`  
**Base:** Fork of `github.com/chriswritescode-dev/opencode-manager`  
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

## Commands

- `pnpm dev` - Start both backend (5001) and frontend (5173)
- `pnpm dev:backend` - Backend only: `tsx watch backend/src/index.ts`
- `pnpm dev:frontend` - Frontend only: `cd frontend && vite`
- `pnpm build` - Build both backend and frontend
- `pnpm test` - Run backend tests
- `pnpm lint` - Lint both backend and frontend
- `pnpm lint:backend` - Backend linting
- `pnpm lint:frontend` - Frontend linting
- `pnpm typecheck` - Typecheck both packages

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

## Code Style

- No comments, self-documenting code only
- No console logs (use proper logger or error handling)
- Strict TypeScript everywhere, proper typing required
- Named imports only: `import { Hono } from 'hono'`, `import { useState } from 'react'`
- DRY principles, follow existing patterns
- Use shared types from workspace package (@helm/shared)
- OpenCode server runs on port 5551, backend API on port 5001
- Prefer pnpm over npm for all package management
- Run `pnpm lint` after completing tasks to ensure code quality

## Key Features

| Feature | Location | Notes |
|---------|----------|-------|
| Multi-server discovery | `backend/src/discovery.ts` | Uses lsof to find OpenCode processes |
| Server switching | `frontend/src/components/servers/` | UI for switching between instances |
| Embedded terminal | `frontend/src/components/terminal/` | Xterm.js + WebGL renderer |
| MCP tool visibility | `frontend/src/components/mcp/` | Real-time tool call monitoring |
| Session management | `frontend/src/components/session/` | List, rename, delete sessions |
| File browser | `frontend/src/components/file-browser/` | Browse and edit files |
| Git integration | `frontend/src/api/git.ts` | Status, diff, branches |

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
