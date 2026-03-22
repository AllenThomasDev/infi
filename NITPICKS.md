# Nitpicks

Minor issues to address later.

## Browser zoom is shared across tiles

All browser webviews use a shared partition (`persist:browser`) for session sharing. Zoom level appears to be coupled across webviews in the same partition — zooming one browser tile affects others. Need to investigate whether Electron's `setZoomLevel` is truly per-webContents or per-partition, and whether CSS transforms or per-webview zoom tracking can work around this.

**File:** `src/components/flow/browser-node.tsx`

## Separate centering from zoom

We should not use `fitView` for focus/centering flows. Centering the selected tile and changing zoom are separate concerns, and coupling them makes navigation fight the user's chosen zoom level. Users should be able to move between tiles while staying zoomed out.

**File:** `src/routes/index.tsx`

## Escape in webview should respect page context

Currently Escape always exits the webview back to tile-selected mode. Ideally, if the user has a focused input, open modal, dropdown, or fullscreen video inside the webview, the first Escape should go to the page and the second Escape should exit the webview (double-Escape pattern). Try the simple version first and only add this if it feels annoying in practice.

**File:** `src/components/flow/browser-node.tsx`
