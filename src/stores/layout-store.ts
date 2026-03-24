import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  NiriCanvasLayout,
  NiriLayoutItem,
  NiriRow,
} from "@/layout/layout-types";
import { TILE_WIDTH } from "@/layout/layout-types";

const MIN_ITEM_WIDTH = Math.round(TILE_WIDTH * 0.25);
const MAX_ITEM_WIDTH = 2400;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

type ResizeMap = Record<string, number | undefined>;

interface ItemLocation {
  item: NiriLayoutItem;
  itemIndex: number;
  row: NiriRow;
  rowIndex: number;
}

interface LayoutState {
  activeCanvasId: string | null;
  addItem: (item: NiriLayoutItem) => void;
  addRowBelow: (item: NiriLayoutItem) => void;
  focusNeighbor: (horizontal: number, vertical: number) => void;
  focusNextItem: () => void;
  focusPrevItem: () => void;
  layout: NiriCanvasLayout;
  layoutsByCanvas: Record<string, NiriCanvasLayout>;
  moveItem: (itemId: string, toRowId: string, index?: number) => void;
  moveItemToAdjacentRow: (itemId: string, direction: -1 | 1) => void;
  removeCanvasLayout: (canvasId: string) => void;
  removeItem: (itemId: string) => void;
  replaceItem: (itemId: string, ref: NiriLayoutItem["ref"]) => void;
  selectItem: (itemId: string, options?: { scroll?: boolean }) => void;
  setActiveCanvas: (canvasId: string | null) => void;
  setColumnWidths: (widths: ResizeMap) => void;
  toggleNotes: () => void;
  toggleOverview: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

function createRow(): NiriRow {
  return { id: crypto.randomUUID(), items: [] };
}

export function createInitialLayout(): NiriCanvasLayout {
  return {
    focusTick: 0,
    isNotesOpen: false,
    isOverviewOpen: false,
    lastColumnByRowId: {},
    selectedItemId: undefined,
    rows: [],
    zoom: 1,
  };
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

function clampPreferredWidth(width: number) {
  return Math.max(MIN_ITEM_WIDTH, Math.min(width, MAX_ITEM_WIDTH));
}

function findItemLocation(
  layout: NiriCanvasLayout,
  itemId: string
): ItemLocation | null {
  for (const [rowIndex, row] of layout.rows.entries()) {
    const itemIndex = row.items.findIndex((item) => item.id === itemId);
    if (itemIndex >= 0) {
      return {
        item: row.items[itemIndex],
        itemIndex,
        row,
        rowIndex,
      };
    }
  }

  return null;
}

function firstItemLocation(layout: NiriCanvasLayout): ItemLocation | null {
  for (const [rowIndex, row] of layout.rows.entries()) {
    const item = row.items[0];
    if (item) {
      return {
        item,
        itemIndex: 0,
        row,
        rowIndex,
      };
    }
  }

  return null;
}

function pruneEmptyRows(layout: NiriCanvasLayout) {
  layout.rows = layout.rows.filter((row) => row.items.length > 0);
}

function setSelection(layout: NiriCanvasLayout, itemId?: string) {
  layout.selectedItemId = itemId;

  if (!itemId) {
    return;
  }

  const location = findItemLocation(layout, itemId);
  if (!location) {
    return;
  }

  layout.lastColumnByRowId[location.row.id] = location.itemIndex;
}

function bumpFocusTick(layout: NiriCanvasLayout) {
  layout.focusTick += 1;
}

function ensureValidSelection(layout: NiriCanvasLayout) {
  pruneEmptyRows(layout);

  if (!layout.rows.length) {
    setSelection(layout, undefined);
    return;
  }

  if (layout.selectedItemId) {
    const selected = findItemLocation(layout, layout.selectedItemId);
    if (selected) {
      layout.lastColumnByRowId[selected.row.id] = selected.itemIndex;
      return;
    }
  }

  const first = firstItemLocation(layout);
  setSelection(layout, first?.item.id);
}

function getSelectedLocation(layout: NiriCanvasLayout): ItemLocation | null {
  if (!layout.selectedItemId) {
    return firstItemLocation(layout);
  }

  return (
    findItemLocation(layout, layout.selectedItemId) ?? firstItemLocation(layout)
  );
}

function selectHorizontalNeighbor(
  layout: NiriCanvasLayout,
  selected: ItemLocation,
  horizontal: number
) {
  if (horizontal === 0) {
    return false;
  }

  const targetIndex = selected.itemIndex + (horizontal > 0 ? 1 : -1);
  const target = selected.row.items[targetIndex];
  if (!target) {
    return false;
  }

  setSelection(layout, target.id);
  return true;
}

function selectVerticalNeighbor(
  layout: NiriCanvasLayout,
  selected: ItemLocation,
  vertical: number
) {
  if (vertical === 0) {
    return false;
  }

  const nextRow = layout.rows[selected.rowIndex + (vertical > 0 ? 1 : -1)];
  if (!nextRow) {
    return false;
  }

  const preferredColumn =
    layout.lastColumnByRowId[nextRow.id] ?? selected.itemIndex;
  const targetIndex = clampIndex(preferredColumn, nextRow.items.length - 1);
  const target = nextRow.items[targetIndex];
  if (!target) {
    return false;
  }

  setSelection(layout, target.id);
  return true;
}

function getVerticalMoveInsertIndex(
  targetRowLastColumn: number | undefined,
  sourceItemIndex: number,
  targetRowLength: number
) {
  if (targetRowLastColumn !== undefined) {
    return clampIndex(targetRowLastColumn + 1, targetRowLength);
  }

  return clampIndex(sourceItemIndex, targetRowLength);
}

export const useLayoutStore = create<LayoutState>()(
  immer((set) => ({
    activeCanvasId: null,
    layout: createInitialLayout(),
    layoutsByCanvas: {},

    setActiveCanvas: (canvasId) => {
      set((state) => {
        if (state.activeCanvasId) {
          state.layoutsByCanvas[state.activeCanvasId] = state.layout;
        }

        if (!canvasId) {
          state.activeCanvasId = null;
          state.layout = createInitialLayout();
          return;
        }

        const existing = state.layoutsByCanvas[canvasId];
        const nextLayout = existing ?? createInitialLayout();
        if (!existing) {
          state.layoutsByCanvas[canvasId] = nextLayout;
        }

        state.activeCanvasId = canvasId;
        state.layout = nextLayout;

        if (nextLayout.selectedItemId) {
          bumpFocusTick(state.layout);
        }
      });
    },

    removeCanvasLayout: (canvasId) => {
      set((state) => {
        delete state.layoutsByCanvas[canvasId];

        if (state.activeCanvasId === canvasId) {
          state.activeCanvasId = null;
          state.layout = createInitialLayout();
        }
      });
    },

    addRowBelow: (item) => {
      set((state) => {
        const selected = getSelectedLocation(state.layout);
        const insertAt = selected
          ? selected.rowIndex + 1
          : state.layout.rows.length;

        const row = createRow();
        row.items.push(item);
        state.layout.rows.splice(insertAt, 0, row);
        bumpFocusTick(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    addItem: (item) => {
      set((state) => {
        if (!state.layout.rows.length) {
          const row = createRow();
          row.items.push(item);
          state.layout.rows.push(row);
          bumpFocusTick(state.layout);
          setSelection(state.layout, item.id);
          return;
        }

        const selected = getSelectedLocation(state.layout);
        if (!selected) {
          return;
        }

        const insertAt = clampIndex(
          selected.itemIndex + 1,
          selected.row.items.length
        );
        selected.row.items.splice(insertAt, 0, item);
        bumpFocusTick(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    selectItem: (itemId, options) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        setSelection(state.layout, location.item.id);
        if (options?.scroll) {
          bumpFocusTick(state.layout);
        }
      });
    },

    focusNeighbor: (horizontal, vertical) => {
      set((state) => {
        const selected = getSelectedLocation(state.layout);
        if (!selected) {
          return;
        }

        const moved =
          selectHorizontalNeighbor(state.layout, selected, horizontal) ||
          selectVerticalNeighbor(state.layout, selected, vertical);

        if (moved) {
          bumpFocusTick(state.layout);
        }
      });
    },

    focusNextItem: () => {
      set((state) => {
        const allItems = state.layout.rows.flatMap((row) => row.items);
        if (allItems.length === 0) {
          return;
        }

        const currentIndex = allItems.findIndex(
          (item) => item.id === state.layout.selectedItemId
        );
        const nextIndex = (currentIndex + 1) % allItems.length;
        setSelection(state.layout, allItems[nextIndex].id);
        bumpFocusTick(state.layout);
      });
    },

    focusPrevItem: () => {
      set((state) => {
        const allItems = state.layout.rows.flatMap((row) => row.items);
        if (allItems.length === 0) {
          return;
        }

        const currentIndex = allItems.findIndex(
          (item) => item.id === state.layout.selectedItemId
        );
        const prevIndex =
          currentIndex <= 0 ? allItems.length - 1 : currentIndex - 1;
        setSelection(state.layout, allItems[prevIndex].id);
        bumpFocusTick(state.layout);
      });
    },

    moveItem: (itemId, toRowId, index) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        const targetRow = state.layout.rows.find((row) => row.id === toRowId);
        if (!targetRow) {
          return;
        }

        const [item] = source.row.items.splice(source.itemIndex, 1);
        if (!item) {
          return;
        }

        const insertAt = clampIndex(
          index ?? targetRow.items.length,
          targetRow.items.length
        );

        targetRow.items.splice(insertAt, 0, item);
        ensureValidSelection(state.layout);
        bumpFocusTick(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    moveItemToAdjacentRow: (itemId, direction) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        let targetRow = state.layout.rows[source.rowIndex + direction];
        if (!targetRow) {
          if (source.row.items.length === 1) {
            return;
          }

          const insertAt =
            direction > 0 ? source.rowIndex + 1 : source.rowIndex;
          targetRow = createRow();
          state.layout.rows.splice(insertAt, 0, targetRow);
        }

        const [item] = source.row.items.splice(source.itemIndex, 1);
        if (!item) {
          return;
        }

        const insertAt = getVerticalMoveInsertIndex(
          state.layout.lastColumnByRowId[targetRow.id],
          source.itemIndex,
          targetRow.items.length
        );
        targetRow.items.splice(insertAt, 0, item);
        ensureValidSelection(state.layout);
        bumpFocusTick(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    removeItem: (itemId) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        const sameRow = source.row;
        const nextInSameRow =
          sameRow.items[source.itemIndex + 1]?.id ??
          sameRow.items[source.itemIndex - 1]?.id;

        const fallbackRow =
          state.layout.rows[source.rowIndex + 1] ??
          state.layout.rows[source.rowIndex - 1];
        const fallbackIndex = clampIndex(
          source.itemIndex,
          Math.max((fallbackRow?.items.length ?? 1) - 1, 0)
        );
        const fallbackItemId = fallbackRow?.items[fallbackIndex]?.id;

        source.row.items.splice(source.itemIndex, 1);
        ensureValidSelection(state.layout);

        const nextSelection = nextInSameRow ?? fallbackItemId;
        if (nextSelection && findItemLocation(state.layout, nextSelection)) {
          bumpFocusTick(state.layout);
          setSelection(state.layout, nextSelection);
          return;
        }

        const first = firstItemLocation(state.layout);
        bumpFocusTick(state.layout);
        setSelection(state.layout, first?.item.id);
      });
    },

    replaceItem: (itemId, ref) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        location.item.ref = ref;
        setSelection(state.layout, itemId);
      });
    },

    setColumnWidths: (widths) => {
      set((state) => {
        for (const row of state.layout.rows) {
          for (const item of row.items) {
            const width = widths[item.id];
            if (width !== undefined) {
              item.preferredWidth = clampPreferredWidth(width);
            }
          }
        }
      });
    },

    toggleNotes: () => {
      set((state) => {
        state.layout.isNotesOpen = !state.layout.isNotesOpen;
      });
    },

    toggleOverview: () => {
      set((state) => {
        state.layout.isOverviewOpen = !state.layout.isOverviewOpen;
      });
    },

    zoomIn: () => {
      set((state) => {
        state.layout.zoom = Math.min(
          MAX_ZOOM,
          Math.round((state.layout.zoom + ZOOM_STEP) * 10) / 10
        );
      });
    },

    zoomOut: () => {
      set((state) => {
        state.layout.zoom = Math.max(
          MIN_ZOOM,
          Math.round((state.layout.zoom - ZOOM_STEP) * 10) / 10
        );
      });
    },
  }))
);

export function getLayoutStore() {
  return useLayoutStore.getState();
}
