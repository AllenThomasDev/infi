# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Run the Electron app in dev mode
npm test               # Run all tests (vitest)
npx vitest run src/path/to/file.test.ts  # Run a single test file
npm run check          # Lint/format check (ultracite/biome)
npm run fix            # Auto-fix lint/format issues
npm run package        # Package the Electron app
npm run make           # Build distributable
```

## Architecture

**infi** is a macOS-only Electron IDE with a tiling window manager canvas. Terminals are the primary interface — this is mission control for coding agents, not a traditional code editor.

### Process Model

```
main.ts (Electron main)
  ├─ BrowserWindow + preload.ts (MessagePort bridge)
  ├─ oRPC handler (upgrades MessagePort → typed RPC)
  ├─ PTY manager (node-pty + tmux, 1 session per terminal)
  └─ IPC context (window ref, middleware)

app.tsx (Renderer)
  ├─ ipc/manager.ts → MessageChannel → oRPC client
  ├─ Zustand stores (layout-store, workspace-store)
  ├─ TanStack Query (git polling, mutations)
  └─ TanStack Router (file-based routes)
```

### IPC Pattern (oRPC + Effect)

Backend handlers live in `src/ipc/`. Each domain (git, terminal, files, etc.) has:
- `handlers.ts` — oRPC handlers that run Effect programs
- `schemas.ts` — Zod input schemas
- `Services/` — Effect service interfaces
- `Layers/` — Effect layer implementations (dependency injection)

The renderer calls handlers via `ipc.client.<domain>.<method>(input)`.

### State Management

- **Zustand + immer** for UI state (layout, workspace)
- **TanStack Query** for server state (git status polling, mutations)
- **Workspace persistence** via localStorage

### UI Stack

- React 19 with compiler optimization
- Tailwind CSS 4 + shadcn/ui (generated components in `src/components/ui/`)
- xterm.js for terminal rendering
- Milkdown for markdown/notes editing

## Protected Files — Do Not Modify

The following were copied from t3code and must not be changed without explicit justification:

- `src/ipc/git/` — all files: contracts, handlers, Layers, Services, schemas, Errors, config, processRunner, isRepo
- `src/lib/git-actions-logic.ts` and `src/lib/git-actions-logic.test.ts`
- `src/lib/git-query.ts`
- `src/lib/git-utils.ts`

**UI wrappers are fine to modify:** `src/components/git-actions.tsx`, `src/components/branch-picker.tsx`, `src/workspace/use-workspace-actions.ts`.

## Code Quality

- **Biome** via ultracite presets. Run `npm run fix` before committing.
- `src/components/ui/` is excluded from lint (shadcn generated).
- Use `npm` for package management, not bun.
