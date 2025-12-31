# Helm: Unified OpenCode Command Center

**Product Requirements Document v2.0**

---

## Executive Summary

**Helm** is a mobile-first web interface for orchestrating multiple OpenCode instances from anywhere. Built by forking `chriswritescode-dev/opencode-web` and incorporating the best ideas from `opencode-vibe` and `VibeTunnel`.

```
┌─────────────────────────────────────────────────────────────────┐
│                          HELM                                    │
│              "Take the helm from anywhere"                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │   Chat   │  │  Files   │  │  Tools   │  │ Terminal │       │
│   │          │  │          │  │          │  │          │       │
│   │ Session  │  │ Git diff │  │ MCP feed │  │ Raw TUI  │       │
│   │ picker   │  │ Browser  │  │ Catalog  │  │ Xterm.js │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Multi-Server Discovery                      │   │
│   │   project-a (TUI) │ project-b (serve) │ project-c (TUI) │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Origin Projects & What We Take

### Base: chriswritescode-dev/opencode-web
**What we inherit:**
- ✅ Mobile-first PWA architecture
- ✅ Docker deployment
- ✅ Git integration (diff, status, branches, PRs)
- ✅ MCP server configuration UI
- ✅ Session management
- ✅ File browser with syntax highlighting
- ✅ OAuth for Anthropic/GitHub
- ✅ TTS playback
- ✅ Slash commands

### From: joelhooks/opencode-vibe
**What we port:**
- ✅ Multi-server auto-discovery via `lsof`
- ✅ Cross-process messaging (Web → TUI)
- ✅ Server routing (messages go to correct OpenCode instance)
- ✅ Real-time SSE sync patterns

### From: VibeTunnel
**What we adapt:**
- ✅ Embedded terminal view (Xterm.js)
- ✅ Bidirectional stdin/stdout via named pipes
- ✅ Watch TUI visually from browser

### Our Additions
**What we build:**
- ✅ MCP tool call visibility dashboard
- ✅ Touch-first gesture navigation
- ✅ Token/cost observability
- ✅ Model switching mid-session
- ✅ Continuum context integration
- ✅ Offline session review

---

## Target User

**Justin's Use Case (Primary Persona):**
- Runs multiple OpenCode instances across different projects on Mac
- Orchestrates complex coding tasks from iPhone while mobile
- Needs visibility into what agents are doing (MCP tools, costs)
- Uses Tailscale for secure remote access
- Values efficiency — no switching between multiple apps

**Success Statement:**
> "I can manage all my OpenCode instances from one iPhone app, see exactly what tools are being called, switch between projects instantly, and the UX feels native — not like a shrunken desktop app."

---

## Feature Requirements

### P0: Must Have (Week 1-2)

#### 1. Multi-Server Discovery & Routing
**Ported from opencode-vibe**

The killer feature that makes Helm different from existing projects.

**Requirements:**
- [ ] Auto-discover all running OpenCode processes (TUI + serve modes)
- [ ] Discovery via `lsof` to find processes listening on OpenCode ports
- [ ] Server selector in UI showing all available instances
- [ ] Route messages to correct server based on session ownership
- [ ] Cross-process messaging: send from Helm, appears in TUI
- [ ] Health monitoring with auto-reconnect
- [ ] Project directory shown for each server

**Implementation approach:**
```typescript
// Backend: discovery.ts
interface OpenCodeServer {
  pid: number;
  port: number;
  mode: 'tui' | 'serve';
  workdir: string;
  status: 'healthy' | 'unhealthy';
  sessions: string[];
}

async function discoverServers(): Promise<OpenCodeServer[]> {
  // Use lsof to find opencode processes
  // Parse their working directories
  // Health check each one
  // Return unified list
}
```

**Acceptance Criteria:**
- User starts 3 OpenCode instances in different directories
- Helm shows all 3 in server picker
- Selecting one loads its sessions
- Messages route to correct instance

#### 2. MCP Tool Visibility Dashboard
**Our addition**

See exactly what your agents are doing.

**Requirements:**
- [ ] Real-time feed of tool calls across all servers
- [ ] Filter by server, tool name, status
- [ ] Expandable details: input, output, duration, tokens
- [ ] Visual indicator in chat when tool is executing
- [ ] Tool catalog showing all available tools per server
- [ ] Server connection status (green/yellow/red)

#### 3. Touch-First Mobile UX
**Our addition**

Native-feeling iPhone experience.

**Requirements:**
- [ ] Bottom navigation (Chat, Files, Tools, Terminal, Settings)
- [ ] Swipe right: server/session picker
- [ ] Swipe left: file browser
- [ ] Long-press on message: copy, retry, branch
- [ ] Pull-to-refresh for server discovery
- [ ] 44x44pt minimum touch targets
- [ ] Safe area handling (notch, Dynamic Island)
- [ ] Haptic feedback on key actions

#### 4. Embedded Terminal View
**Adapted from VibeTunnel**

Sometimes you want to see the raw TUI.

**Requirements:**
- [ ] Terminal tab showing live OpenCode TUI output
- [ ] Full Xterm.js rendering with ANSI support
- [ ] Bidirectional input (type commands)
- [ ] Server selector to pick which TUI to view
- [ ] Scrollback buffer
- [ ] Mobile-optimized terminal font sizing

### P1: Should Have (Week 3-4)

#### 5. Token & Cost Observability
- [ ] Real-time token counter per session
- [ ] Cost tracking with configurable model rates
- [ ] Historical usage charts
- [ ] Budget alerts

#### 6. Model Switching Mid-Session
- [ ] Change models without new session
- [ ] Model badge on each message
- [ ] Quick-switch between recent models

#### 7. Continuum Context Integration
- [ ] Load/save context to Continuum MCP
- [ ] Auto-suggest relevant contexts
- [ ] Sync indicator

### P2: Nice to Have (Week 5+)

#### 8. Offline Session Review
- [ ] PWA with service worker
- [ ] Cache recent sessions
- [ ] Queue messages for later

#### 9. Swarm Integration
- [ ] Display swarm task decomposition
- [ ] Show worker status
- [ ] Checkpoint visibility

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     iPhone (via Tailscale)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Helm PWA                              │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │  Chat   │ │  Files  │ │  Tools  │ │Terminal │       │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │    │
│  │                        │                                 │    │
│  │              Server Picker (multi-select)                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS via Tailscale
                              │
┌─────────────────────────────────────────────────────────────────┐
│                          Mac                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Helm Backend                            │    │
│  │                   (Bun server)                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │  Discovery   │  │   Router     │  │  Terminal    │   │    │
│  │  │  (lsof)      │  │  (sessions)  │  │  (pty/pipe)  │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│            ┌─────────────────┼─────────────────┐                │
│            ▼                 ▼                 ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   OpenCode   │  │   OpenCode   │  │   OpenCode   │          │
│  │  (project-a) │  │  (project-b) │  │  (project-c) │          │
│  │   TUI :4096  │  │  serve :4097 │  │   TUI :4098  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│            │                 │                 │                │
│            ▼                 ▼                 ▼                │
│  ┌──────────────────────────────────────────────────┐          │
│  │                   MCP Servers                     │          │
│  │   filesystem │ continuum │ github │ custom...    │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### New Backend Endpoints

```typescript
// Discovery
GET  /api/servers                    // List discovered OpenCode instances
GET  /api/servers/:id/health         // Health check specific server
POST /api/servers/refresh            // Force re-discovery

// Routing (extends existing session endpoints)
GET  /api/servers/:serverId/sessions
POST /api/servers/:serverId/sessions/:sessionId/message

// Terminal
GET  /api/terminal/:serverId/stream  // SSE for terminal output
POST /api/terminal/:serverId/input   // Send keystrokes

// MCP Visibility
GET  /api/mcp/servers                // All MCP servers across all OpenCode instances
GET  /api/mcp/tools                  // Aggregated tool catalog
GET  /api/mcp/calls                  // Tool call history
SSE  /api/mcp/events                 // Real-time tool call stream
```

### Frontend Structure

```
frontend/src/
├── components/
│   ├── chat/              # Existing
│   ├── files/             # Existing
│   ├── settings/          # Existing
│   ├── servers/           # NEW: Multi-server management
│   │   ├── ServerPicker.tsx
│   │   ├── ServerCard.tsx
│   │   └── ServerHealth.tsx
│   ├── mcp/               # NEW: MCP visibility
│   │   ├── ToolCallFeed.tsx
│   │   ├── ToolCallDetail.tsx
│   │   ├── ToolCatalog.tsx
│   │   └── ServerStatus.tsx
│   ├── terminal/          # NEW: Embedded terminal
│   │   ├── TerminalView.tsx
│   │   ├── TerminalInput.tsx
│   │   └── TerminalTabs.tsx
│   └── mobile/            # NEW: Touch-first components
│       ├── BottomNav.tsx
│       ├── SwipeableView.tsx
│       ├── GestureHandler.tsx
│       └── MobileInput.tsx
├── stores/
│   ├── serverStore.ts     # NEW: Multi-server state
│   ├── mcpStore.ts        # NEW: MCP visibility state
│   ├── terminalStore.ts   # NEW: Terminal state
│   └── gestureStore.ts    # NEW: UI gesture state
└── hooks/
    ├── useServerDiscovery.ts  # NEW
    ├── useToolCalls.ts        # NEW
    ├── useTerminal.ts         # NEW
    └── useGestures.ts         # NEW
```

---

## Migration Path

### Week 1: Foundation
1. Fork chriswritescode-dev/opencode-web
2. Rename to `helm` (update package.json, Docker, etc.)
3. Audit codebase, document architecture
4. Set up development environment

### Week 2: Multi-Server
1. Port discovery logic from opencode-vibe
2. Implement server routing
3. Build ServerPicker UI
4. Test with multiple OpenCode instances

### Week 3: MCP & Terminal
1. Build MCP visibility components
2. Integrate Xterm.js for terminal view
3. Implement tool call feed
4. Add terminal tab to navigation

### Week 4: Mobile Polish
1. Implement touch gestures
2. Bottom navigation
3. Safe area handling
4. Performance optimization

### Week 5+: Enhancements
1. Cost tracking
2. Model switching
3. Continuum integration
4. Offline support

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to switch between 3 projects | < 3 taps |
| MCP tool call visibility latency | < 100ms |
| PWA install rate | > 40% of mobile users |
| Server discovery accuracy | 100% (find all instances) |
| Terminal render fidelity | Matches native TUI |

---

## Open Questions

1. **Naming:** Is "Helm" the right name? Alternatives: Vigil, Relay, Lattice
2. **Upstream:** Contribute multi-server back to chriswritescode, or maintain fork?
3. **Terminal:** Embed Xterm.js directly or iframe VibeTunnel?
4. **Auth:** Skip for v1, or implement basic auth for public deployments?

---

## Appendix: Competitor Feature Matrix

| Feature | Helm (Goal) | chriswritescode | opencode-vibe | VibeTunnel | oc-web (archived) |
|---------|-------------|-----------------|---------------|------------|-------------------|
| Multi-server discovery | ✅ | ❌ | ✅ | ❌ | ❌ |
| Cross-process messaging | ✅ | ❌ | ✅ | ❌ | ❌ |
| Mobile-first UX | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| MCP tool visibility | ✅ | ❌ | ❌ | ❌ | ✅ |
| Embedded terminal | ✅ | ❌ | ❌ | ✅ | ❌ |
| Git integration | ✅ | ✅ | ❌ | ❌ | ❌ |
| Docker deployment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Touch gestures | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Cost tracking | ✅ | ⚠️ | ❌ | ❌ | ⚠️ |
| Offline support | ✅ | ⚠️ | ❌ | ❌ | ❌ |

**Helm = Best of all worlds**
