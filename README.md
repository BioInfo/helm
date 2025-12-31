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

## Quick Start

### Local Development

```bash
# Clone
git clone https://github.com/BioInfo/helm.git
cd helm

# Install
pnpm install

# Run
pnpm dev

# Open http://localhost:5001
```

### With Tailscale

```bash
# On your Mac
pnpm dev

# On your iPhone
# Navigate to http://your-mac.tailnet:5001
```

### With Docker

```bash
docker-compose up -d
# Access at http://localhost:5003
```

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

## Use Case

Run multiple OpenCode instances:
```bash
cd ~/work/api && opencode          # TUI mode
cd ~/work/frontend && opencode serve  # Headless
cd ~/work/infra && opencode        # TUI mode
```

Helm finds them all. Switch between projects with a tap. See tool calls in real-time. All from your iPhone.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PRD.md](./docs/PRD.md) | Product requirements & architecture |
| [docs/CHECKLIST.md](./docs/CHECKLIST.md) | Implementation progress tracker |
| [AGENTS.md](./AGENTS.md) | Development context for AI agents |

## Dev Server Ports

The Docker container exposes ports `5100-5103` for running dev servers inside your repositories:

```yaml
ports:
  - "5003:5003"      # Helm
  - "5100:5100"      # Dev server 1
  - "5101:5101"      # Dev server 2
  - "5102:5102"      # Dev server 3
  - "5103:5103"      # Dev server 4
```


## Troubleshooting & Testing

### Apple Silicon (M1/M2/M3/M4) Fixes

If you see `posix_spawnp failed` errors when opening a terminal:

1. **Rebuild node-pty for ARM64:**
   ```bash
   cd node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty
   npx node-gyp rebuild
   ```
2. **Restart the backend:**
   Kill the `bun` process running the backend and restart `pnpm dev`.

### Quick Test Script

Verify terminal functionality without the UI:

```bash
./scripts/test-terminal.sh
```

### Manual API Test

```bash
# Create terminal
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
