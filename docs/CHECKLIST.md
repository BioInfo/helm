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
- [x] `pnpm add @xterm/xterm @xterm/addon-fit` (frontend)
- [x] `pnpm add node-pty` (backend)

### 3.2 Terminal Backend
- [x] Create `backend/src/services/terminal.ts` - PTY session management
- [x] Create `backend/src/routes/terminal.ts`
- [x] `POST /api/terminal/create` — create terminal session
- [x] `GET /api/terminal/:sessionId/stream` — SSE output (base64)
- [x] `POST /api/terminal/:sessionId/input` — send keystrokes
- [x] `POST /api/terminal/:sessionId/resize` — resize terminal
- [x] `DELETE /api/terminal/:sessionId` — close session
- [x] PTY via node-pty with auto-cleanup

### 3.3 Terminal Component
- [x] Create `frontend/src/components/terminal/TerminalView.tsx`
- [x] Initialize Xterm.js with fit addon
- [x] Connect to SSE stream
- [x] Send input on keypress
- [x] Handle resize
- [x] Tokyo Night theme styling

### 3.4 Integration
- [x] Add "Terminal" indicator to header navigation
- [x] Server context awareness (uses selected server's workdir)
- [x] Mobile-optimized with safe area padding

---

## Phase 4: Touch-First Mobile UX

### 4.1 Bottom Navigation
- [x] Create `frontend/src/components/mobile/BottomNav.tsx`
- [x] 5 tabs: Chat, Files, Tools, Terminal, Settings
- [x] Active state styling
- [x] Badge for active tool calls (pulsing animation)
- [x] Safe area padding with env(safe-area-inset-bottom)

### 4.2 Mobile Navigation Store
- [x] Create `frontend/src/stores/mobileNavStore.ts`
- [x] Track active tab with persistence
- [x] Previous tab tracking for back navigation

### 4.3 Gesture Support
- [x] `pnpm add @use-gesture/react` installed
- [x] Existing `useSwipeBack` hook in `useMobile.ts`
- [x] Haptic feedback on tab switch

### 4.4 Mobile Layout
- [x] Create `frontend/src/components/mobile/MobileLayout.tsx`
- [x] Wrapper component with bottom nav integration
- [x] Proper content padding for nav bar

### 4.5 Touch Optimization
- [x] All nav touch targets >= 44x44pt (min-h-[48px] min-w-[56px])
- [x] Touch manipulation CSS for responsive taps
- [x] Safe area handling throughout

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
