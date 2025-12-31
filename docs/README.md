# ⎈ Helm

**Take the helm from anywhere.**

A unified mobile-first command center for managing multiple OpenCode instances. Built for iPhone + Tailscale workflows.

---

## What is Helm?

Helm is a fork of [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) that adds:

- **Multi-server discovery** — Auto-finds all running OpenCode instances
- **MCP tool visibility** — See exactly what tools your agents are calling
- **Embedded terminal** — Watch the raw TUI from your browser
- **Touch-first UX** — Swipe gestures, bottom nav, haptic feedback

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

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/helm.git
cd helm

# Install
bun install

# Run
npm run dev

# Open http://localhost:5001
```

## With Tailscale

```bash
# On your Mac
npm run dev -- --host 0.0.0.0

# On your iPhone
# Navigate to http://your-mac.tailnet:5001
```

## With Docker

```bash
docker-compose up -d
```

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements & architecture |
| [AGENTS.md](./AGENTS.md) | OpenCode development context |
| [CHECKLIST.md](./CHECKLIST.md) | Implementation progress tracker |

## Features

### Inherited from chriswritescode-dev
- ✅ Mobile-first PWA
- ✅ Git integration (diff, branches, PRs)
- ✅ MCP server configuration
- ✅ Session management
- ✅ File browser
- ✅ Docker deployment

### Added by Helm
- 🔨 Multi-server auto-discovery
- 🔨 Cross-process messaging
- 🔨 MCP tool call visibility
- 🔨 Embedded terminal (Xterm.js)
- 🔨 Touch gestures & haptics
- 🔨 Token/cost tracking

## Use Case

Run multiple OpenCode instances:
```bash
cd ~/work/api && opencode          # TUI mode
cd ~/work/frontend && opencode serve  # Headless
cd ~/work/infra && opencode        # TUI mode
```

Helm finds them all. Switch between projects with a tap. See tool calls in real-time. Watch the TUI visually. All from your iPhone.

## Origin Projects

Helm combines the best ideas from:

- [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) — Base (mobile PWA, git, MCP config)
- [joelhooks/opencode-vibe](https://github.com/joelhooks/opencode-vibe) — Multi-server discovery
- [VibeTunnel](https://vibetunnel.sh) — Terminal in browser concept

## License

MIT — Same as base project.

---

*Built for remote coding orchestration. Take the helm from anywhere.*
