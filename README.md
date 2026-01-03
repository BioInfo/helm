# Helm

**Take the helm from anywhere.**

A unified mobile-first command center for managing multiple OpenCode instances. Built for iPhone + Tailscale workflows.

## What is Helm?

Helm is a fork of [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) that adds:

- **Multi-server discovery** — Auto-finds all running OpenCode instances
- **MCP tool visibility** — See exactly what tools your agents are calling
- **Embedded terminal** — Full terminal access from your browser
- **Touch-first UX** — Swipe gestures, bottom nav, haptic feedback
- **Offline support** — Cache sessions and queue messages when offline

```
┌─────────────────────────────────────────────────────────────┐
│                          HELM                                │
│                                                              │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│   │  Chat  │  │  Files │  │  Tools │  │Terminal│           │
│   └────────┘  └────────┘  └────────┘  └────────┘           │
│                                                              │
│   ┌───────────────────────────────────────────────────────┐ │
│   │           project-a │ project-b │ project-c           │ │
│   │              TUI    │   serve   │    TUI              │ │
│   └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Requirements

- **Node.js** 20+ 
- **pnpm** 9+
- **OpenCode** CLI (`npm install -g @anthropics/opencode`)

## Quick Start

### Native (Recommended)

Run Helm directly on your Mac to discover all local OpenCode instances:

```bash
# Clone
git clone https://github.com/BioInfo/helm.git
cd helm

# Install
pnpm install

# Run
pnpm dev

# Open http://localhost:5173 (frontend dev server)
# API available at http://localhost:5001
```

Then start OpenCode in your project directories:
```bash
cd ~/project-api && opencode          # TUI mode - Helm will find it
cd ~/project-frontend && opencode serve  # Headless - Helm will find it
cd ~/project-infra && opencode        # TUI mode - Helm will find it
```

Helm auto-discovers all running instances and lets you switch between them.

### With Tailscale (Mobile Access)

```bash
# On your Mac
pnpm dev

# On your iPhone via Tailscale
# Navigate to http://your-mac.tailnet:5173
```

### With Docker (Isolated/Single-Server)

Docker mode runs a single embedded OpenCode instance. Use this for:
- Isolated environments
- Self-hosted deployments
- Users who don't need multi-server discovery

```bash
docker-compose up -d
# Access at http://localhost:5003
```

> **Note:** Docker cannot discover OpenCode instances on the host machine due to process isolation. For multi-server discovery, run Helm natively.

## Features

### Inherited from opencode-web
- Mobile-first PWA
- Git integration (diff, branches, PRs)
- MCP server configuration
- Session management
- File browser with syntax highlighting
- Model selection and provider management
- Text-to-speech for AI responses

### Added by Helm
- **Multi-server discovery** — Auto-detect OpenCode instances via lsof
- **Server switching** — Seamlessly switch between projects
- **MCP tool feed** — Real-time visibility into tool calls
- **Embedded terminal** — Xterm.js with PTY backend
- **Bottom navigation** — Mobile-optimized tab bar
- **Offline mode** — IndexedDB caching + message queue
- **Touch gestures** — Swipe-to-go-back, haptic feedback

## Roadmap

### Current (v0.1)
- [x] Multi-server discovery (local via lsof)
- [x] Server switching UI
- [x] Embedded terminal
- [x] MCP tool visibility
- [x] Mobile-first UX
- [x] Docker deployment option

### Planned (v0.2)
- [ ] **Multi-machine discovery** — See OpenCode across Mac, DGX, Pi, cloud servers
- [ ] Network-based server registration
- [ ] SSH tunnel support for remote instances
- [ ] Server grouping by machine/location

### Future
- [ ] Swarm task visualization
- [ ] Cost budgets and alerts
- [ ] Session sharing/collaboration
- [ ] Custom MCP server templates

## Documentation

| Document | Purpose |
|----------|---------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](./SECURITY.md) | Security policy |
| [AGENTS.md](./AGENTS.md) | Development context for AI agents |
| [docs/PRD.md](./docs/PRD.md) | Product requirements & architecture |

## Troubleshooting

### Apple Silicon (M1/M2/M3/M4)

If you see `posix_spawnp failed` errors when opening a terminal:

```bash
cd node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty
npx node-gyp rebuild
```

Then restart with `pnpm dev`.

### Verify Server Discovery

```bash
# Check what OpenCode instances Helm can see
curl http://localhost:5001/api/servers | jq .
```

### Test Terminal API

```bash
curl -X POST http://localhost:5001/api/terminal/create \
  -H "Content-Type: application/json" \
  -d '{"workdir": "/tmp"}'
```

## Origin Projects

Helm combines the best ideas from:

- [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) — Base (mobile PWA, git, MCP config)
- [joelhooks/opencode-vibe](https://github.com/joelhooks/opencode-vibe) — Multi-server discovery pattern
- [VibeTunnel](https://vibetunnel.sh) — Terminal in browser concept
- [OpenCode](https://opencode.ai) — The AI coding agent

## License

MIT
