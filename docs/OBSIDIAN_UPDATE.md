# Helm Project Update (For Obsidian)

**Please copy this content to: `Projects/Helm/README.md` in your Obsidian vault.**

# Helm

**Unified OpenCode command center. Take the helm from anywhere.**

A mobile-first PWA for managing multiple OpenCode instances, specifically designed for iPhone + Tailscale workflows.

## Status: Active Development

**Location:** `~/apps/helm`
**URL:** `http://localhost:5001` (Dev) / `http://localhost:5003` (Docker)

---

## Architecture

- **Frontend:** React + Vite (PWA)
- **Backend:** Bun + Hono
- **Discovery:** `lsof` based auto-discovery of local OpenCode instances
- **Terminal:** `node-pty` + xterm.js (embedded shell)

## Development Log

### 2025-12-31 - Terminal Fix (Apple Silicon)

**Issue:** Terminal creation failed with `posix_spawnp failed`.
**Cause:** `node-pty` native bindings were not compatible with ARM64/Bun environment or were missing.
**Resolution:**
1.  Rebuilt `node-pty` using `node-gyp` specifically for `darwin-arm64`.
2.  Verified binary exists at `node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty/build/Release/pty.node`.
3.  Tested spawn successfully with both `node` and `bun` scripts.
4.  Updated `backend/src/services/terminal.ts` to use explicit shell detection and better logging.
5.  Updated `backend/src/routes/terminal.ts` with proper error handling.

**Next Steps:**
- [ ] Restart backend to load new binary
- [ ] Verify terminal UI in frontend
- [ ] Implement multi-server discovery (Phase 1)

### 2025-12-31 - Initial Setup & Branding

- Renamed from `opencode-web` to `Helm`.
- Port changed to 5001 to match Vite proxy.
- Fixed infinite loop in `mcpStore.ts`.
- PWA offline support added.

---

## Key Commands

```bash
# Start Dev Server
cd ~/apps/helm
pnpm dev

# Rebuild node-pty (if needed)
cd ~/apps/helm/node_modules/.pnpm/node-pty@1.1.0/node_modules/node-pty
npx node-gyp rebuild
```

## Reference

- **Base Project:** [opencode-web](https://github.com/chriswritescode-dev/opencode-web)
- **Inspiration:** [opencode-vibe](https://github.com/joelhooks/opencode-vibe)
