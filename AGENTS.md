# AGENTS.md - Helm Development Context

> **Helm** — Unified OpenCode command center. Take the helm from anywhere.

## Project Overview

**Base Repository:** Fork of `github.com/chriswritescode-dev/opencode-web`  
**Purpose:** Single mobile-first interface for managing multiple OpenCode instances  
**Primary Use Case:** Remote coding orchestration from iPhone via Tailscale  

## Quick Start

```bash
# Clone
git clone https://github.com/BioInfo/helm.git
cd helm

# Install
pnpm install

# Run
pnpm dev
# Verify: http://localhost:5001 loads

# Start multiple OpenCode instances for testing
cd ~/project-a && opencode &
cd ~/project-b && opencode serve &
cd ~/project-c && opencode &
```

## What Makes Helm Different

Helm combines the best of three projects:

| Feature | Source Project | Status |
|---------|----------------|--------|
| Mobile-first PWA | chriswritescode-dev | ✅ Inherited |
| Git integration | chriswritescode-dev | ✅ Inherited |
| MCP config UI | chriswritescode-dev | ✅ Inherited |
| Docker deployment | chriswritescode-dev | ✅ Inherited |
| **Multi-server discovery** | opencode-vibe | ✅ Implemented |
| **Embedded terminal** | VibeTunnel | ✅ Implemented |
| **MCP tool visibility** | Our addition | ✅ Implemented |
| **Touch gestures** | Our addition | ✅ Implemented |
| **Offline support** | Our addition | ✅ Implemented |

## Architecture

```
iPhone (Tailscale) → Helm Backend → Multiple OpenCode Instances
                           │
                           ├── Discovery (lsof)
                           ├── Router (session → server)
                           └── Terminal (pty/Xterm.js)
```

### Existing Structure (from chriswritescode-dev)
```
helm/
├── frontend/           # React + TypeScript PWA
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks  
│   │   ├── stores/     # State management
│   │   └── utils/      # Utilities
│   └── public/         # Static assets
├── backend/            # Bun server
│   └── src/            # API routes
├── shared/             # Shared types
└── docker-compose.yml
```

### New Directories to Create
```
frontend/src/
├── components/
│   ├── servers/        # NEW: Multi-server management
│   ├── mcp/            # NEW: MCP visibility
│   ├── terminal/       # NEW: Embedded terminal
│   └── mobile/         # NEW: Touch-first components
├── stores/
│   ├── serverStore.ts  # NEW
│   ├── mcpStore.ts     # NEW
│   └── terminalStore.ts # NEW
└── hooks/
    ├── useServerDiscovery.ts # NEW
    ├── useToolCalls.ts       # NEW
    └── useTerminal.ts        # NEW
```

## Implementation Priorities

### Phase 1: Multi-Server Discovery (CRITICAL)

This is the killer feature. Port from opencode-vibe.

**File to create:** `backend/src/discovery.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OpenCodeServer {
  id: string;
  pid: number;
  port: number;
  mode: 'tui' | 'serve';
  workdir: string;
  status: 'healthy' | 'unhealthy';
}

export async function discoverServers(): Promise<OpenCodeServer[]> {
  // Find all opencode processes via lsof
  const { stdout } = await execAsync(
    "lsof -iTCP -sTCP:LISTEN -P | grep opencode || true"
  );
  
  const servers: OpenCodeServer[] = [];
  
  for (const line of stdout.split('\n').filter(Boolean)) {
    // Parse lsof output: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    const parts = line.split(/\s+/);
    const pid = parseInt(parts[1]);
    const portMatch = parts[parts.length - 1].match(/:(\d+)/);
    const port = portMatch ? parseInt(portMatch[1]) : 4096;
    
    // Get working directory via lsof -p PID
    const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} | grep cwd || true`);
    const cwdMatch = cwdOut.match(/\s(\/\S+)$/m);
    const workdir = cwdMatch ? cwdMatch[1] : 'unknown';
    
    // Determine mode by checking if TUI is attached
    // TUI mode has a TTY, serve mode doesn't
    const { stdout: ttyOut } = await execAsync(`ps -p ${pid} -o tty= || true`);
    const mode = ttyOut.trim() && ttyOut.trim() !== '?' ? 'tui' : 'serve';
    
    // Health check
    let status: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const response = await fetch(`http://localhost:${port}/session`, {
        signal: AbortSignal.timeout(2000)
      });
      status = response.ok ? 'healthy' : 'unhealthy';
    } catch {}
    
    servers.push({
      id: `${pid}-${port}`,
      pid,
      port,
      mode,
      workdir,
      status,
    });
  }
  
  return servers;
}
```

**Route to add:** `backend/src/routes/servers.ts`

```typescript
import { Hono } from 'hono';
import { discoverServers } from '../discovery';

const app = new Hono();

// Cache discovery results for 5 seconds
let cache: { servers: OpenCodeServer[]; timestamp: number } | null = null;

app.get('/api/servers', async (c) => {
  const now = Date.now();
  if (!cache || now - cache.timestamp > 5000) {
    cache = { servers: await discoverServers(), timestamp: now };
  }
  return c.json(cache.servers);
});

app.post('/api/servers/refresh', async (c) => {
  cache = { servers: await discoverServers(), timestamp: Date.now() };
  return c.json(cache.servers);
});

app.get('/api/servers/:id/health', async (c) => {
  const servers = await discoverServers();
  const server = servers.find(s => s.id === c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  return c.json({ status: server.status });
});

export default app;
```

### Phase 2: MCP Tool Visibility

**Store:** `frontend/src/stores/mcpStore.ts`

```typescript
import { create } from 'zustand';

interface MCPToolCall {
  id: string;
  serverId: string;
  sessionId: string;
  toolName: string;
  serverName: string; // MCP server name (filesystem, github, etc.)
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'success' | 'error';
  error?: string;
  startTime: number;
  endTime?: number;
}

interface MCPState {
  toolCalls: MCPToolCall[];
  activeCallIds: Set<string>;
  
  addToolCall: (call: MCPToolCall) => void;
  updateToolCall: (id: string, update: Partial<MCPToolCall>) => void;
  getCallsForSession: (sessionId: string) => MCPToolCall[];
}

export const useMCPStore = create<MCPState>((set, get) => ({
  toolCalls: [],
  activeCallIds: new Set(),
  
  addToolCall: (call) => set((state) => ({
    toolCalls: [call, ...state.toolCalls].slice(0, 500),
    activeCallIds: new Set([...state.activeCallIds, call.id]),
  })),
  
  updateToolCall: (id, update) => set((state) => {
    const newActiveIds = new Set(state.activeCallIds);
    if (update.status && update.status !== 'pending') {
      newActiveIds.delete(id);
    }
    return {
      toolCalls: state.toolCalls.map(c => c.id === id ? { ...c, ...update } : c),
      activeCallIds: newActiveIds,
    };
  }),
  
  getCallsForSession: (sessionId) => 
    get().toolCalls.filter(c => c.sessionId === sessionId),
}));
```

### Phase 3: Embedded Terminal

**Component:** `frontend/src/components/terminal/TerminalView.tsx`

```typescript
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  serverId: string;
}

export function TerminalView({ serverId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
      },
    });
    
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();
    
    terminalRef.current = terminal;
    
    // Connect to terminal stream
    const eventSource = new EventSource(`/api/terminal/${serverId}/stream`);
    eventSource.onmessage = (event) => {
      terminal.write(event.data);
    };
    
    // Send input to server
    terminal.onData((data) => {
      fetch(`/api/terminal/${serverId}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
    });
    
    // Handle resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    
    return () => {
      eventSource.close();
      terminal.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [serverId]);
  
  return (
    <div 
      ref={containerRef} 
      className="h-full w-full bg-[#1a1b26]"
      style={{ padding: 'env(safe-area-inset-bottom)' }}
    />
  );
}
```

### Phase 4: Touch-First Mobile UX

**Component:** `frontend/src/components/mobile/BottomNav.tsx`

```typescript
import { Home, FolderOpen, Wrench, Terminal, Settings } from 'lucide-react';

type Tab = 'chat' | 'files' | 'tools' | 'terminal' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  activeToolCalls?: number;
  serverCount?: number;
}

export function BottomNav({ 
  activeTab, 
  onTabChange, 
  activeToolCalls = 0,
  serverCount = 0,
}: BottomNavProps) {
  const tabs: { id: Tab; icon: typeof Home; label: string; badge?: number }[] = [
    { id: 'chat', icon: Home, label: 'Chat' },
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'tools', icon: Wrench, label: 'Tools', badge: activeToolCalls },
    { id: 'terminal', icon: Terminal, label: 'Terminal' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => {
              onTabChange(id);
              if ('vibrate' in navigator) navigator.vibrate(10);
            }}
            className={`
              flex flex-col items-center py-2 px-3 min-w-[56px] min-h-[48px]
              transition-colors
              ${activeTab === id 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400'
              }
            `}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 2} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

## Code Style Guidelines

1. **TypeScript Strict** — No `any`, complete types
2. **Functional Components** — No classes
3. **Zustand for State** — Keep stores focused
4. **Tailwind for Styling** — Utility-first, dark mode support
5. **44x44pt Touch Targets** — Minimum for all interactive elements
6. **Safe Area Handling** — Use `env(safe-area-inset-*)` for iOS

## Testing Checklist

Before submitting any PR:

- [ ] Works on iPhone Safari
- [ ] Works on desktop Chrome
- [ ] Dark mode correct
- [ ] Touch targets >= 44pt
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Multi-server discovery finds all instances
- [ ] SSE streams don't leak

## Key Dependencies to Add

```bash
# Terminal emulation
bun add xterm xterm-addon-fit

# Gestures
bun add @use-gesture/react react-spring

# Icons (if not present)
bun add lucide-react

# Date formatting
bun add date-fns
```

## Environment Variables

```bash
# .env
HELM_PORT=5001                    # Web UI port
OPENCODE_DISCOVERY_INTERVAL=5000  # Server discovery poll interval (ms)
HELM_TERMINAL_ENABLED=true        # Enable embedded terminal feature
```

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm run typecheck              # TypeScript check

# Docker
docker-compose up -d           # Start production
docker-compose logs -f         # View logs
docker-compose down            # Stop

# Testing multi-server
cd ~/project-a && opencode &   # Start TUI instance
cd ~/project-b && opencode serve & # Start headless instance
curl http://localhost:5001/api/servers # Should list both
```

## Reference: OpenCode SSE Event Types

When parsing SSE from `opencode serve`:

```typescript
type SSEEvent = 
  | { type: 'message.start'; data: { id: string; role: string } }
  | { type: 'message.delta'; data: { content: string } }
  | { type: 'message.end'; data: { id: string } }
  | { type: 'tool_use'; data: { id: string; name: string; input: unknown } }
  | { type: 'tool_result'; data: { id: string; output: unknown } }
  | { type: 'error'; data: { message: string } }
  | { type: 'usage'; data: { input_tokens: number; output_tokens: number } };
```

## Reference: opencode-vibe Discovery Logic

From joelhooks/opencode-vibe — the pattern we're porting:

```typescript
// They use lsof to find processes, then cross-reference with /proc or ps
// to get working directories and determine TUI vs serve mode

// Key insight: TUI mode has a controlling TTY, serve mode doesn't
// This lets us distinguish between the two
```

## Contact & Resources

- **Base Project:** github.com/chriswritescode-dev/opencode-web
- **Discovery Reference:** github.com/joelhooks/opencode-vibe
- **Terminal Reference:** github.com/amantus-ai/vibetunnel
- **OpenCode:** github.com/sst/opencode
- **Xterm.js:** xtermjs.org
