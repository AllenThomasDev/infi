import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  NiriCanvasLayout,
  NiriLayoutItem,
  NiriWorkspace,
} from "@/layout/layout-types";
import { TILE_WIDTH } from "@/layout/layout-types";

const MIN_ITEM_WIDTH = Math.round(TILE_WIDTH * 0.25);
const MAX_ITEM_WIDTH = 2400;

type ResizeMap = Record<string, number | undefined>;

interface ItemLocation {
  item: NiriLayoutItem;
  itemIndex: number;
  workspace: NiriWorkspace;
  workspaceIndex: number;
}

interface LayoutState {
  activeCanvasId: string | null;
  addItem: (item: NiriLayoutItem) => void;
  addWorkspaceBelow: (item: NiriLayoutItem) => void;
  focusNeighbor: (horizontal: number, vertical: number) => void;
  layout: NiriCanvasLayout;
  layoutsByCanvas: Record<string, NiriCanvasLayout>;
  moveItem: (itemId: string, toWorkspaceId: string, index?: number) => void;
  moveItemToAdjacentWorkspace: (itemId: string, direction: -1 | 1) => void;
  removeCanvasLayout: (canvasId: string) => void;
  removeItem: (itemId: string) => void;
  replaceItem: (itemId: string, ref: NiriLayoutItem["ref"]) => void;
  selectItem: (itemId: string) => void;
  setActiveCanvas: (canvasId: string | null) => void;
  setColumnWidths: (widths: ResizeMap) => void;
  toggleOverview: () => void;
}

function createWorkspace(): NiriWorkspace {
  return { id: crypto.randomUUID(), items: [] };
}

export function createInitialLayout(): NiriCanvasLayout {
  return {
    focusTick: 0,
    isOverviewOpen: false,
    lastColumnByWorkspaceId: {},
    selectedItemId: undefined,
    workspaces: [],
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
  for (const [workspaceIndex, workspace] of layout.workspaces.entries()) {
    const itemIndex = workspace.items.findIndex((item) => item.id === itemId);
    if (itemIndex >= 0) {
      return {
        item: workspace.items[itemIndex],
        itemIndex,
        workspace,
        workspaceIndex,
      };
    }
  }

  return null;
}

function firstItemLocation(layout: NiriCanvasLayout): ItemLocation | null {
  for (const [workspaceIndex, workspace] of layout.workspaces.entries()) {
    const item = workspace.items[0];
    if (item) {
      return {
        item,
        itemIndex: 0,
        workspace,
        workspaceIndex,
      };
    }
  }

  return null;
}

function pruneEmptyWorkspaces(layout: NiriCanvasLayout) {
  layout.workspaces = layout.workspaces.filter(
    (workspace) => workspace.items.length > 0
  );
}

function setSelection(layout: NiriCanvasLayout, itemId?: string) {
  layout.focusTick += 1;
  layout.selectedItemId = itemId;

  if (!itemId) {
    return;
  }

  const location = findItemLocation(layout, itemId);
  if (!location) {
    return;
  }

  layout.lastColumnByWorkspaceId[location.workspace.id] = location.itemIndex;
}

function ensureValidSelection(layout: NiriCanvasLayout) {
  pruneEmptyWorkspaces(layout);

  if (!layout.workspaces.length) {
    setSelection(layout, undefined);
    return;
  }

  if (layout.selectedItemId) {
    const selected = findItemLocation(layout, layout.selectedItemId);
    if (selected) {
      layout.lastColumnByWorkspaceId[selected.workspace.id] =
        selected.itemIndex;
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
  const target = selected.workspace.items[targetIndex];
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

  const nextWorkspace =
    layout.workspaces[selected.workspaceIndex + (vertical > 0 ? 1 : -1)];
  if (!nextWorkspace) {
    return false;
  }

  const preferredColumn =
    layout.lastColumnByWorkspaceId[nextWorkspace.id] ?? selected.itemIndex;
  const targetIndex = clampIndex(
    preferredColumn,
    nextWorkspace.items.length - 1
  );
  const target = nextWorkspace.items[targetIndex];
  if (!target) {
    return false;
  }

  setSelection(layout, target.id);
  return true;
}

function getVerticalMoveInsertIndex(
  targetWorkspaceLastColumn: number | undefined,
  sourceItemIndex: number,
  targetWorkspaceLength: number
) {
  if (targetWorkspaceLastColumn !== undefined) {
    return clampIndex(targetWorkspaceLastColumn + 1, targetWorkspaceLength);
  }

  return clampIndex(sourceItemIndex, targetWorkspaceLength);
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

    addWorkspaceBelow: (item) => {
      set((state) => {
        const selected = getSelectedLocation(state.layout);
        const insertAt = selected
          ? selected.workspaceIndex + 1
          : state.layout.workspaces.length;

        const workspace = createWorkspace();
        workspace.items.push(item);
        state.layout.workspaces.splice(insertAt, 0, workspace);
        setSelection(state.layout, item.id);
      });
    },

    addItem: (item) => {
      set((state) => {
        if (!state.layout.workspaces.length) {
          const workspace = createWorkspace();
          workspace.items.push(item);
          state.layout.workspaces.push(workspace);
          setSelection(state.layout, item.id);
          return;
        }

        const selected = getSelectedLocation(state.layout);
        if (!selected) {
          return;
        }

        const insertAt = clampIndex(
          selected.itemIndex + 1,
          selected.workspace.items.length
        );
        selected.workspace.items.splice(insertAt, 0, item);
        setSelection(state.layout, item.id);
      });
    },

    selectItem: (itemId) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        setSelection(state.layout, location.item.id);
      });
    },

    focusNeighbor: (horizontal, vertical) => {
      set((state) => {
        const selected = getSelectedLocation(state.layout);
        if (!selected) {
          return;
        }

        if (selectHorizontalNeighbor(state.layout, selected, horizontal)) {
          return;
        }

        selectVerticalNeighbor(state.layout, selected, vertical);
      });
    },

    moveItem: (itemId, toWorkspaceId, index) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        const targetWorkspace = state.layout.workspaces.find(
          (workspace) => workspace.id === toWorkspaceId
        );
        if (!targetWorkspace) {
          return;
        }

        const [item] = source.workspace.items.splice(source.itemIndex, 1);
        if (!item) {
          return;
        }

        const insertAt = clampIndex(
          index ?? targetWorkspace.items.length,
          targetWorkspace.items.length
        );

        targetWorkspace.items.splice(insertAt, 0, item);
        ensureValidSelection(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    moveItemToAdjacentWorkspace: (itemId, direction) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        let targetWorkspace =
          state.layout.workspaces[source.workspaceIndex + direction];
        if (!targetWorkspace) {
          if (source.workspace.items.length === 1) {
            return;
          }

          const insertAt =
            direction > 0 ? source.workspaceIndex + 1 : source.workspaceIndex;
          targetWorkspace = createWorkspace();
          state.layout.workspaces.splice(insertAt, 0, targetWorkspace);
        }

        const [item] = source.workspace.items.splice(source.itemIndex, 1);
        if (!item) {
          return;
        }

        const insertAt = getVerticalMoveInsertIndex(
          state.layout.lastColumnByWorkspaceId[targetWorkspace.id],
          source.itemIndex,
          targetWorkspace.items.length
        );
        targetWorkspace.items.splice(insertAt, 0, item);
        ensureValidSelection(state.layout);
        setSelection(state.layout, item.id);
      });
    },

    removeItem: (itemId) => {
      set((state) => {
        const source = findItemLocation(state.layout, itemId);
        if (!source) {
          return;
        }

        const sameWorkspace = source.workspace;
        const nextInSameRow =
          sameWorkspace.items[source.itemIndex + 1]?.id ??
          sameWorkspace.items[source.itemIndex - 1]?.id;

        const fallbackWorkspace =
          state.layout.workspaces[source.workspaceIndex + 1] ??
          state.layout.workspaces[source.workspaceIndex - 1];
        const fallbackIndex = clampIndex(
          source.itemIndex,
          Math.max((fallbackWorkspace?.items.length ?? 1) - 1, 0)
        );
        const fallbackItemId = fallbackWorkspace?.items[fallbackIndex]?.id;

        source.workspace.items.splice(source.itemIndex, 1);
        ensureValidSelection(state.layout);

        const nextSelection = nextInSameRow ?? fallbackItemId;
        if (nextSelection && findItemLocation(state.layout, nextSelection)) {
          setSelection(state.layout, nextSelection);
          return;
        }

        const first = firstItemLocation(state.layout);
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
        for (const workspace of state.layout.workspaces) {
          for (const item of workspace.items) {
            const width = widths[item.id];
            if (width !== undefined) {
              item.preferredWidth = clampPreferredWidth(width);
            }
          }
        }
      });
    },

    toggleOverview: () => {
      set((state) => {
        state.layout.isOverviewOpen = !state.layout.isOverviewOpen;
      });
    },
  }))
);

export function getLayoutStore() {
  return useLayoutStore.getState();
}
