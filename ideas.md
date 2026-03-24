## Nits

- Revisit tile viewport zoom: CSS `transform: scale(...)` on the rendered layout cuts off content and behaves like shrinking the DOM subtree instead of zooming the tile system.

## Canvas / Tiles

- Add a grouped nodes view in the canvas, grouped by node type.
- Add fullscreen / restore for the selected node.
- Add standard tile actions in the header: minimize, maximize, close.
- Clarify tile state semantics: collapse = reduce size in place, minimize = remove from main layout into a restorable tray/dock.
- Add a hidden/minimized tiles strip or tray for restoring minimized nodes.
- Add quick split actions on tiles: split right and split down.
- Add focus mode that emphasizes the selected tile without fully fullscreening it.
- Add pin / keep-visible behavior for important tiles.
- Add tile presets from the picker, such as browser + terminal or two terminals.
- Add grouped overview actions like create-by-type, counts per type, and bulk close by type.
- Add tile tabs / stack mode to reduce canvas sprawl.
- Add drag/reorder support in overview and grouped views.
- Add per-tile state badges for loading, error, running, and idle states.
- Add a mini-map or jump list for fast navigation across large canvases.
- Add a recent/hidden tiles panel to restore accidentally closed or minimized nodes.
