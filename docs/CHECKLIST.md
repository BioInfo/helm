# Helm Implementation Checklist

Quick reference for building Helm. Check off as you complete.

---

## Phase 1: Setup & Multi-Server Discovery

### 1.1 Project Setup
- [ ] Fork chriswritescode-dev/opencode-web
- [ ] Rename to "helm" in package.json, docker-compose.yml
- [ ] Update branding (logo, title, etc.)
- [ ] Verify base project runs: `bun install && npm run dev`
- [ ] Test with single OpenCode instance

### 1.2 Discovery Backend
- [x] Create `backend/src/discovery.ts`
- [x] Implement `discoverServers()` using lsof
- [x] Parse PID, port, working directory
- [x] Detect TUI vs serve mode (TTY check)
- [x] Health check each server

### 1.3 Discovery API
- [x] Create `backend/src/routes/servers.ts`
- [x] `GET /api/servers` — list all discovered servers
- [x] `POST /api/servers/refresh` — force re-discovery
- [x] `GET /api/servers/:id/health` — health check
- [x] Add 5-second cache to prevent hammering lsof

### 1.4 Server Picker UI
- [x] Create `frontend/src/stores/serverStore.ts`
- [x] Create `frontend/src/components/servers/ServerPicker.tsx`
- [x] Create `frontend/src/components/servers/ServerCard.tsx`
- [x] Show server list with: workdir, mode, status
- [x] Route session API calls through selected server
- [x] Persist last selected server

### 1.5 Multi-Server Testing
- [ ] Start 3 OpenCode instances in different directories
- [ ] Verify all 3 appear in server picker
- [ ] Verify sessions load for selected server
- [ ] Verify messages route correctly
- [ ] Test switching between servers

---

## Phase 2: MCP Tool Visibility

### 2.1 MCP Store
- [x] Create `frontend/src/stores/mcpStore.ts`
- [x] Interface for MCPToolCall
- [x] addToolCall, updateToolCall actions
- [x] Filter by session, server

### 2.2 SSE Hook for Tool Calls
- [x] Integrated into `frontend/src/hooks/useSSE.ts` (line 142)
- [x] Parse tool_use / tool_result events from SSE
- [x] Update store in real-time
- [x] Handle errors

### 2.3 Tool Call Feed
- [x] Create `frontend/src/components/mcp/ToolCallFeed.tsx`
- [x] Reverse-chronological list
- [x] Pulsing indicator for active calls
- [x] Duration badge for completed
- [x] Error styling for failed

### 2.4 Tool Call Detail
- [x] Create `frontend/src/components/mcp/ToolCallDetail.tsx`
- [x] Dialog-based detail view (mobile-friendly)
- [x] JSON view for input/output
- [x] Copy buttons
- [x] Timing info

### 2.5 Integration
- [x] Add "Tools" indicator to header navigation
- [x] Show tool call count badge (pulsing for active)
- [x] Visual indicator in chat during tool execution (via ToolCallPart)

---

## Phase 3: Embedded Terminal

### 3.1 Dependencies
- [ ] `bun add xterm xterm-addon-fit`

### 3.2 Terminal Backend
- [ ] Create `backend/src/routes/terminal.ts`
- [ ] `GET /api/terminal/:serverId/stream` — SSE output
- [ ] `POST /api/terminal/:serverId/input` — send keystrokes
- [ ] PTY or named pipe to OpenCode process

### 3.3 Terminal Component
- [ ] Create `frontend/src/components/terminal/TerminalView.tsx`
- [ ] Initialize Xterm.js with fit addon
- [ ] Connect to SSE stream
- [ ] Send input on keypress
- [ ] Handle resize

### 3.4 Integration
- [ ] Add "Terminal" tab to navigation
- [ ] Server selector within terminal view
- [ ] Mobile-optimized font size

---

## Phase 4: Touch-First Mobile UX

### 4.1 Bottom Navigation
- [ ] Create `frontend/src/components/mobile/BottomNav.tsx`
- [ ] 5 tabs: Chat, Files, Tools, Terminal, Settings
- [ ] Active state styling
- [ ] Badge for active tool calls
- [ ] Safe area padding

### 4.2 Gesture Store
- [ ] Create `frontend/src/stores/gestureStore.ts`
- [ ] Track sidebar/sheet open state
- [ ] Track compose expanded state

### 4.3 Swipe Gestures
- [ ] `bun add @use-gesture/react react-spring`
- [ ] Create `frontend/src/components/mobile/SwipeableView.tsx`
- [ ] Swipe right → server/session picker
- [ ] Swipe left → file browser
- [ ] Haptic feedback on trigger

### 4.4 Mobile Input
- [ ] Create `frontend/src/components/mobile/MobileInput.tsx`
- [ ] Visual viewport handling for iOS keyboard
- [ ] Auto-resize textarea
- [ ] 16px font (prevent iOS zoom)
- [ ] Safe area bottom padding

### 4.5 Polish
- [ ] All touch targets >= 44x44pt
- [ ] Test on iPhone Safari
- [ ] Test PWA installed mode
- [ ] Dark mode throughout

---

## Phase 5: Observability & Enhancements

### 5.1 Token/Cost Tracking
- [ ] Create `frontend/src/stores/observabilityStore.ts`
- [ ] Parse usage events from SSE
- [ ] Create `TokenCounter.tsx` component
- [ ] Configurable cost rates per model
- [ ] Session cost display

### 5.2 Model Switching
- [ ] Modify model selector to work mid-session
- [ ] Add model badge to messages
- [ ] Quick-switch UI for recent models

### 5.3 Offline Support
- [ ] Service worker for PWA
- [ ] Cache recent sessions in IndexedDB
- [ ] Queue pending messages
- [ ] Sync on reconnect

---

## Final Checklist

- [ ] All TypeScript errors resolved
- [ ] No console errors/warnings
- [ ] Works on iPhone Safari
- [ ] Works on iPad Safari
- [ ] Works on desktop Chrome
- [ ] Docker build succeeds
- [ ] README updated with Helm branding
- [ ] Screenshots/demo video created
