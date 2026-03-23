# Nitpicks

Minor issues to address later.

## Browser zoom is shared across tiles

All browser webviews use a shared partition (`persist:browser`) for session sharing. Zoom level appears to be coupled across webviews in the same partition — zooming one browser tile affects others. Need to investigate whether Electron's `setZoomLevel` is truly per-webContents or per-partition, and whether CSS transforms or per-webview zoom tracking can work around this.

**File:** `src/components/flow/browser-node.tsx`

## Expose hardcoded layout and behavior values as settings

Several important UX/layout values are still hardcoded and should be surfaced through a central settings layer so users can tune the workspace to their preferences. Best first candidates: tile width/height/gap, canvas zoom min/max, canvas fit duration/padding, canvas grid gap, browser default home/search template, terminal font size/line height/scrollback, sidebar desktop/mobile width, and the mobile breakpoint.

**Files:** `src/layout/tile-constants.ts`, `src/components/workspace/canvas.tsx`, `src/components/flow/browser-node.tsx`, `src/components/flow/node-registry.tsx`, `src/components/terminal/terminal-view.tsx`, `src/components/ui/sidebar.tsx`, `src/hooks/use-mobile.ts`

## Separate centering from zoom

We should not use `fitView` for focus/centering flows. Centering the selected tile and changing zoom are separate concerns, and coupling them makes navigation fight the user's chosen zoom level. Users should be able to move between tiles while staying zoomed out.

**File:** `src/routes/index.tsx`

## Escape in webview should respect page context

Currently Escape always exits the webview back to tile-selected mode. Ideally, if the user has a focused input, open modal, dropdown, or fullscreen video inside the webview, the first Escape should go to the page and the second Escape should exit the webview (double-Escape pattern). Try the simple version first and only add this if it feels annoying in practice.

**File:** `src/components/flow/browser-node.tsx`

## Clarify close vs delete canvas semantics before persistence

Today `closeCanvas` actually removes the canvas from workspace state, and may also delete its managed worktree after confirmation. That is acceptable for now, but once canvases gain persisted node state, layout state, and reopening behavior, this naming/behavior mismatch will become a product decision rather than an implementation detail. We should decide whether `Close Canvas` means dismiss from the current workspace while preserving recoverable state, and reserve `Delete Canvas` for destructive removal.

**Files:** `src/workspace/use-workspace-actions.ts`, `src/workspace/workspace-store.ts`, `src/workspace/use-workspace-command-handlers.ts`, `src/keybindings/defaults.ts`
