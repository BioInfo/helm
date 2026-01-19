<p align="center">
  <img src="./assets/helm-banner.png" alt="Helm Banner" width="100%">
</p>

<p align="center">
  <strong>Take the helm from anywhere.</strong>
</p>

<p align="center">
  <a href="https://github.com/BioInfo/helm/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178c6" alt="TypeScript"></a>
  <a href="https://github.com/BioInfo/helm/stargazers"><img src="https://img.shields.io/github/stars/BioInfo/helm?style=social" alt="GitHub Stars"></a>
</p>

---

## 🎯 What is Helm?

A **unified mobile-first command center** for managing multiple OpenCode and Claude Code instances. Built for iPhone + Tailscale workflows.

Helm is a fork of [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) that adds:

- **Multi-server discovery** — Auto-finds all running OpenCode and Claude Code instances
- **MCP tool visibility** — See exactly what tools your agents are calling
- **Embedded terminal** — Full terminal access from your browser
- **Touch-first UX** — Swipe gestures, bottom nav, haptic feedback
- **Offline support** — Cache sessions and queue messages when offline

<p align="center">
  <img src="./assets/helm-architecture.png" alt="Helm Architecture" width="100%">
</p>

---

## ✨ Features

### Inherited from opencode-web
- ✅ Mobile-first PWA
- ✅ Git integration (diff, branches, PRs)
- ✅ MCP server configuration
- ✅ Session management
- ✅ File browser with syntax highlighting
- ✅ Model selection and provider management
- ✅ Text-to-speech for AI responses

### Added by Helm
- ⚡ **Multi-server discovery** — Auto-detect OpenCode and Claude Code instances via lsof
- 🔄 **Server switching** — Seamlessly switch between projects
- 🔍 **MCP tool feed** — Real-time visibility into tool calls
- 💻 **Embedded terminal** — Xterm.js with PTY backend
- 📱 **Bottom navigation** — Mobile-optimized tab bar
- 📴 **Offline mode** — IndexedDB caching + message queue
- 👆 **Touch gestures** — Swipe-to-go-back, haptic feedback

---

## 🚀 Quick Start

### Requirements

- **Node.js** 20+
- **pnpm** 9+
- **OpenCode** CLI (`npm install -g @anthropics/opencode`) and/or **Claude Code** CLI

### Native (Recommended)

Run Helm directly on your Mac to discover all local OpenCode and Claude Code instances:

```bash
# Clone
git clone https://github.com/BioInfo/helm.git
cd helm

# Install
pnpm install

# Run
pnpm dev

# Open http://localhost:5174 (frontend dev server)
# API available at http://localhost:5001
```

Then start OpenCode or Claude Code in your project directories:
```bash
cd ~/project-api && opencode          # OpenCode TUI mode - Helm will find it
cd ~/project-frontend && claude serve # Claude Code headless - Helm will find it
cd ~/project-infra && opencode serve  # OpenCode headless - Helm will find it
```

Helm auto-discovers all running instances and lets you switch between them. Each server shows a badge indicating which CLI it's running (OpenCode or Claude).

### 📱 With Tailscale (Mobile Access)

```bash
# On your Mac
pnpm dev

# On your iPhone via Tailscale
# Navigate to http://your-mac.tailnet:5174
# Add to Home Screen for native app feel
```

### 🐳 With Docker (Isolated/Single-Server)

Docker mode runs a single embedded OpenCode instance. Use this for:
- Isolated environments
- Self-hosted deployments
- Users who don't need multi-server discovery

```bash
docker-compose up -d
# Access at http://localhost:5003
```

> **Note:** Docker cannot discover OpenCode instances on the host machine due to process isolation. For multi-server discovery, run Helm natively.

---

## 🗺️ Roadmap

### Current (v0.1) ✅
- [x] Multi-server discovery (local via lsof)
- [x] Server switching UI
- [x] Embedded terminal
- [x] MCP tool visibility
- [x] Mobile-first UX
- [x] Docker deployment option

### Planned (v0.2) 🚧
- [ ] **Claude Code native integration** — Unified discovery and support for both OpenCode and Claude Code
- [ ] **Multi-machine discovery** — See instances across Mac, Linux servers, Raspberry Pis, cloud VMs
- [ ] Network-based server registration
- [ ] SSH tunnel support for remote instances
- [ ] Server grouping by machine/location

### Future 🔮
- [ ] Swarm task visualization
- [ ] Cost budgets and alerts
- [ ] Session sharing/collaboration
- [ ] Custom MCP server templates
- [ ] Agent orchestration UI (parallel task decomposition)

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](./SECURITY.md) | Security policy |
| [AGENTS.md](./AGENTS.md) | Development context for AI agents |
| [docs/PRD.md](./docs/PRD.md) | Product requirements & architecture |
| [docs/CHECKLIST.md](./docs/CHECKLIST.md) | Implementation progress tracker |

---

## 🛠️ Troubleshooting

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

---

## 🏛️ Origin Projects

Helm combines the best ideas from:

- [chriswritescode-dev/opencode-web](https://github.com/chriswritescode-dev/opencode-web) — Base (mobile PWA, git, MCP config)
- [joelhooks/opencode-vibe](https://github.com/joelhooks/opencode-vibe) — Multi-server discovery pattern
- [VibeTunnel](https://vibetunnel.sh) — Terminal in browser concept
- [OpenCode](https://opencode.ai) — The AI coding agent

---

## 🙏 Acknowledgments

Special thanks to:

- **[@chriswritescode](https://github.com/chriswritescode-dev)** — For building opencode-web, the foundation that made Helm possible
- **[@joelhooks](https://github.com/joelhooks)** — For pioneering multi-server discovery patterns in opencode-vibe
- **The VibeTunnel team** — For proving that browser-based terminal access can work beautifully
- **[@anthropics](https://github.com/anthropics)** — For Claude Code and OpenCode, the AI coding agents that power modern development
- **The Anthropic community** — For feedback, bug reports, and feature ideas that shape Helm's direction

Helm exists because developers before us shared their work openly. This project stands on the shoulders of giants.

---

## 📜 License

MIT
