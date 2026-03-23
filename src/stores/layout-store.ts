import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  NiriCanvasLayout,
  NiriColumn,
  NiriLayoutItem,
  NiriWorkspace,
} from "@/layout/layout-types";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/layout-types";

const MIN_COLUMN_WIDTH = Math.round(TILE_WIDTH * 0.25);
const MIN_ITEM_HEIGHT = Math.round(TILE_HEIGHT * 0.25);
const MAX_COLUMN_WIDTH = 2400;
const MAX_ITEM_HEIGHT = 2400;
const WORKSPACE_NAME_PREFIX = "Workspace";

type ResizeMap = Record<string, number | undefined>;

interface FocusTarget {
  column: NiriColumn;
  item: NiriLayoutItem;
  workspace: NiriWorkspace;
}

interface LayoutState {
  activeCanvasId: string | null;
  addColumnRight: (item: NiriLayoutItem) => void;
  addItemBelow: (item: NiriLayoutItem) => void;
  addWorkspaceBelow: (item: NiriLayoutItem) => void;
  focusNeighbor: (horizontal: number, vertical: number) => void;
  layout: NiriCanvasLayout;
  layoutsByCanvas: Record<string, NiriCanvasLayout>;
  moveColumn: (columnId: string, toWorkspaceId: string, index: number) => void;
  moveItem: (itemId: string, toColumnId: string, index?: number) => void;
  moveItemToNewColumn: (itemId: string, index?: number) => void;
  removeCanvasLayout: (canvasId: string) => void;
  removeItem: (itemId: string) => void;
  replaceItem: (itemId: string, ref: NiriLayoutItem["ref"]) => void;
  selectItem: (itemId: string) => void;
  setActiveCanvas: (canvasId: string | null) => void;
  setColumnWidths: (widths: ResizeMap) => void;
  setItemHeights: (heights: ResizeMap) => void;
  swapColumns: (columnId: string, otherColumnId: string) => void;
  toggleOverview: () => void;
  toggleTabbed: () => void;
}

function createWorkspace({
  id = crypto.randomUUID(),
  name,
}: {
  id?: string;
  name?: string;
} = {}): NiriWorkspace {
  return { id, name: name ?? `${WORKSPACE_NAME_PREFIX} 1`, columns: [] };
}

function parseWorkspaceNameIndex(name: string) {
  const match = new RegExp(`^${WORKSPACE_NAME_PREFIX}\\s+(\\d+)$`).exec(name);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getNextWorkspaceName(layout: NiriCanvasLayout) {
  let maxIndex = 0;

  for (const workspace of layout.workspaces) {
    const parsedIndex = parseWorkspaceNameIndex(workspace.name);
    if (parsedIndex && parsedIndex > maxIndex) {
      maxIndex = parsedIndex;
    }
  }

  return `${WORKSPACE_NAME_PREFIX} ${maxIndex + 1}`;
}

function createColumn(item: NiriLayoutItem): NiriColumn {
  return {
    id: crypto.randomUUID(),
    items: [item],
    focusedItemId: item.id,
    displayMode: "normal",
  };
}

export function createInitialLayout(): NiriCanvasLayout {
  return {
    workspaces: [],
    camera: {},
    isOverviewOpen: false,
  };
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length));
}

function clampPreferredWidth(width: number) {
  return Math.max(MIN_COLUMN_WIDTH, Math.min(width, MAX_COLUMN_WIDTH));
}

function clampPreferredHeight(height: number) {
  return Math.max(MIN_ITEM_HEIGHT, Math.min(height, MAX_ITEM_HEIGHT));
}

function findItemLocation(layout: NiriCanvasLayout, itemId: string) {
  for (const workspace of layout.workspaces) {
    for (const column of workspace.columns) {
      const itemIndex = column.items.findIndex((item) => item.id === itemId);
      if (itemIndex >= 0) {
        return { workspace, column, itemIndex, item: column.items[itemIndex] };
      }
    }
  }
  return null;
}

function workspaceIndexById(layout: NiriCanvasLayout, workspaceId?: string) {
  if (!workspaceId) {
    return -1;
  }
  return layout.workspaces.findIndex(
    (workspace) => workspace.id === workspaceId
  );
}

function columnIndexById(workspace: NiriWorkspace, columnId?: string) {
  if (!columnId) {
    return -1;
  }
  return workspace.columns.findIndex((column) => column.id === columnId);
}

function getActiveWorkspace(layout: NiriCanvasLayout) {
  const activeIndex = workspaceIndexById(
    layout,
    layout.camera.activeWorkspaceId
  );
  return layout.workspaces[activeIndex] ?? layout.workspaces[0];
}

function getActiveColumn(layout: NiriCanvasLayout) {
  const workspace = getActiveWorkspace(layout);
  if (!workspace) {
    return null;
  }

  const activeIndex = columnIndexById(workspace, layout.camera.activeColumnId);
  return {
    workspace,
    column:
      workspace.columns[activeIndex] ??
      workspace.columns.find((candidate) => candidate.items.length > 0) ??
      null,
  };
}

function applyFocus(layout: NiriCanvasLayout, target: FocusTarget | null) {
  const focusTick = (layout.camera.focusTick ?? 0) + 1;

  if (target) {
    target.column.focusedItemId = target.item.id;
    target.workspace.focusedColumnId = target.column.id;
    layout.camera = {
      activeWorkspaceId: target.workspace.id,
      activeColumnId: target.column.id,
      focusedItemId: target.item.id,
      focusTick,
    };
    return;
  }

  layout.camera = {
    activeWorkspaceId: layout.workspaces[0]?.id,
    focusTick,
  };
}

function getFocusedTarget(layout: NiriCanvasLayout): FocusTarget | null {
  const focusedItemId = layout.camera.focusedItemId;
  if (focusedItemId) {
    const location = findItemLocation(layout, focusedItemId);
    if (location) {
      return {
        workspace: location.workspace,
        column: location.column,
        item: location.item,
      };
    }
  }

  const active = getActiveColumn(layout);
  if (!active?.column) {
    return null;
  }

  const focusedItem =
    active.column.items.find(
      (item) => item.id === active.column.focusedItemId
    ) ?? active.column.items[0];

  return focusedItem
    ? {
        workspace: active.workspace,
        column: active.column,
        item: focusedItem,
      }
    : null;
}

function getColumnFocusTarget(
  workspace: NiriWorkspace,
  column: NiriColumn,
  preferredIndex: number
): FocusTarget | null {
  if (column.items.length === 0) {
    return null;
  }

  const item =
    column.items[clampIndex(preferredIndex, column.items.length - 1)] ??
    column.items[0];
  return item ? { workspace, column, item } : null;
}

function firstFocusTarget(layout: NiriCanvasLayout): FocusTarget | null {
  for (const workspace of layout.workspaces) {
    for (const column of workspace.columns) {
      if (column.items[0]) {
        return getColumnFocusTarget(workspace, column, 0);
      }
    }
  }
  return null;
}

function getDirectionalStep(horizontal: number, vertical: number) {
  if (horizontal !== 0) {
    return horizontal > 0 ? 1 : -1;
  }

  return vertical > 0 ? 1 : -1;
}

function getAdjacentColumnTarget(
  workspace: NiriWorkspace,
  columnId: string,
  preferredItemIndex: number,
  horizontal: number
) {
  const currentColumnIndex = columnIndexById(workspace, columnId);
  if (currentColumnIndex < 0) {
    return workspace.columns[0]
      ? getColumnFocusTarget(
          workspace,
          workspace.columns[0],
          preferredItemIndex
        )
      : null;
  }

  const nextColumn =
    workspace.columns[currentColumnIndex + getDirectionalStep(horizontal, 0)];
  if (!nextColumn) {
    return null;
  }

  return getColumnFocusTarget(workspace, nextColumn, preferredItemIndex);
}

function getAdjacentWorkspaceTarget(
  layout: NiriCanvasLayout,
  workspaceId: string,
  columnId: string,
  preferredItemIndex: number,
  vertical: number
) {
  const currentWorkspaceIndex = workspaceIndexById(layout, workspaceId);
  if (currentWorkspaceIndex < 0) {
    return firstFocusTarget(layout);
  }

  const currentWorkspace = layout.workspaces[currentWorkspaceIndex];
  const currentColumnIndex = columnIndexById(currentWorkspace, columnId);
  const nextWorkspace =
    layout.workspaces[currentWorkspaceIndex + (vertical > 0 ? 1 : -1)];
  if (!nextWorkspace || nextWorkspace.columns.length === 0) {
    return null;
  }

  const rememberedColumn = nextWorkspace.focusedColumnId
    ? nextWorkspace.columns.find((c) => c.id === nextWorkspace.focusedColumnId)
    : null;
  const targetColumn =
    rememberedColumn ??
    nextWorkspace.columns[
      currentColumnIndex >= 0
        ? Math.min(currentColumnIndex, nextWorkspace.columns.length - 1)
        : 0
    ];

  return getColumnFocusTarget(nextWorkspace, targetColumn, preferredItemIndex);
}

function getNeighborTarget(
  layout: NiriCanvasLayout,
  fromItemId: string,
  horizontal: number,
  vertical: number
): FocusTarget | null {
  const location = findItemLocation(layout, fromItemId);
  if (!location) {
    return firstFocusTarget(layout);
  }

  if (vertical !== 0) {
    const nextIndex = location.itemIndex + (vertical > 0 ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < location.column.items.length) {
      return getColumnFocusTarget(
        location.workspace,
        location.column,
        nextIndex
      );
    }

    if (horizontal === 0) {
      return getAdjacentWorkspaceTarget(
        layout,
        location.workspace.id,
        location.column.id,
        location.itemIndex,
        vertical
      );
    }
  }

  if (horizontal === 0 && vertical === 0) {
    return null;
  }

  return getAdjacentColumnTarget(
    location.workspace,
    location.column.id,
    location.itemIndex,
    horizontal
  );
}

function getFocusAfterRemoval(
  layout: NiriCanvasLayout,
  removedWorkspaceId: string,
  removedColumnId: string,
  removedColumnIndex: number,
  removedItemIndex: number
): FocusTarget | null {
  const workspace = layout.workspaces.find(
    (candidate) => candidate.id === removedWorkspaceId
  );
  const sameColumn = workspace?.columns.find(
    (candidate) => candidate.id === removedColumnId
  );

  if (workspace && sameColumn) {
    return getColumnFocusTarget(workspace, sameColumn, removedItemIndex);
  }

  if (workspace?.columns.length) {
    const fallbackColumn =
      workspace.columns[
        Math.min(removedColumnIndex, workspace.columns.length - 1)
      ] ?? workspace.columns[0];

    return getColumnFocusTarget(workspace, fallbackColumn, removedItemIndex);
  }

  return firstFocusTarget(layout);
}

function findColumnById(layout: NiriCanvasLayout, columnId: string) {
  for (const workspace of layout.workspaces) {
    const column = workspace.columns.find(
      (candidate) => candidate.id === columnId
    );
    if (column) {
      return { workspace, column };
    }
  }

  return null;
}

function findColumnIndex(layout: NiriCanvasLayout, columnId: string) {
  for (const workspace of layout.workspaces) {
    const index = workspace.columns.findIndex(
      (column) => column.id === columnId
    );
    if (index >= 0) {
      return { workspace, index, column: workspace.columns[index] };
    }
  }

  return null;
}

function removeItemFromLayout(layout: NiriCanvasLayout, itemId: string) {
  const location = findItemLocation(layout, itemId);
  if (!location) {
    return { item: null };
  }

  const movedItem = location.item;
  location.column.items.splice(location.itemIndex, 1);
  if (location.column.focusedItemId === itemId) {
    location.column.focusedItemId = undefined;
  }

  return { item: movedItem };
}

function normalizeLayout(layout: NiriCanvasLayout) {
  for (const workspace of layout.workspaces) {
    workspace.columns = workspace.columns.filter(
      (column) => column.items.length > 0
    );

    for (const column of workspace.columns) {
      if (!column.items.some((item) => item.id === column.focusedItemId)) {
        column.focusedItemId = column.items[0]?.id;
      }
    }
  }

  layout.workspaces = layout.workspaces.filter(
    (workspace) => workspace.columns.length > 0
  );

  const focused = layout.camera.focusedItemId
    ? findItemLocation(layout, layout.camera.focusedItemId)
    : null;
  if (focused) {
    applyFocus(layout, {
      workspace: focused.workspace,
      column: focused.column,
      item: focused.item,
    });
    return;
  }

  const activeWorkspace =
    layout.workspaces.find(
      (workspace) => workspace.id === layout.camera.activeWorkspaceId
    ) ?? layout.workspaces[0];
  const activeColumn = activeWorkspace?.columns[0];
  const activeItem = activeColumn?.items[0];
  if (activeWorkspace && activeColumn && activeItem) {
    applyFocus(layout, {
      workspace: activeWorkspace,
      column: activeColumn,
      item: activeItem,
    });
  }
}

function insertColumn(
  layout: NiriCanvasLayout,
  item: NiriLayoutItem,
  offset: number
) {
  const active = getActiveColumn(layout);
  let workspace = active?.workspace ?? layout.workspaces[0];
  if (!workspace) {
    workspace = createWorkspace();
    layout.workspaces.push(workspace);
  }

  const nextColumn = createColumn(item);
  const activeIndex = active?.column
    ? workspace.columns.findIndex((column) => column.id === active.column?.id)
    : workspace.columns.length - 1;
  const insertAt =
    activeIndex >= 0
      ? clampIndex(activeIndex + offset, workspace.columns.length)
      : workspace.columns.length;
  workspace.columns.splice(insertAt, 0, nextColumn);

  return { workspace, column: nextColumn, item } satisfies FocusTarget;
}

function appendItemToActiveColumn(
  layout: NiriCanvasLayout,
  item: NiriLayoutItem
) {
  const active = getActiveColumn(layout);
  if (!active?.column) {
    return insertColumn(layout, item, 1);
  }

  active.column.items.push(item);
  active.column.focusedItemId = item.id;

  return {
    workspace: active.workspace,
    column: active.column,
    item,
  } satisfies FocusTarget;
}

export const useLayoutStore = create<LayoutState>()(
  immer((set) => ({
    activeCanvasId: null,
    layoutsByCanvas: {},
    layout: createInitialLayout(),

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

        const isActiveCanvas = state.activeCanvasId === canvasId;
        if (isActiveCanvas) {
          state.activeCanvasId = null;
          state.layout = createInitialLayout();
        }
      });
    },

    addWorkspaceBelow: (item) => {
      set((state) => {
        const activeWorkspaceIndex = workspaceIndexById(
          state.layout,
          state.layout.camera.activeWorkspaceId
        );
        const insertAt =
          activeWorkspaceIndex >= 0
            ? activeWorkspaceIndex + 1
            : state.layout.workspaces.length;
        const nextWorkspace = createWorkspace({
          name: getNextWorkspaceName(state.layout),
        });
        const nextColumn = createColumn(item);
        nextWorkspace.columns = [nextColumn];

        state.layout.workspaces.splice(insertAt, 0, nextWorkspace);
        applyFocus(state.layout, {
          workspace: nextWorkspace,
          column: nextColumn,
          item,
        });
      });
    },

    selectItem: (itemId) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        applyFocus(state.layout, {
          workspace: location.workspace,
          column: location.column,
          item: location.item,
        });
      });
    },

    addColumnRight: (item) => {
      set((state) => {
        const target = insertColumn(state.layout, item, 1);
        normalizeLayout(state.layout);

        const inserted = findItemLocation(state.layout, target.item.id);
        if (!inserted) {
          return;
        }

        applyFocus(state.layout, {
          workspace: inserted.workspace,
          column: inserted.column,
          item: inserted.item,
        });
      });
    },

    addItemBelow: (item) => {
      set((state) => {
        const target = appendItemToActiveColumn(state.layout, item);
        normalizeLayout(state.layout);

        const inserted = findItemLocation(state.layout, target.item.id);
        if (!inserted) {
          return;
        }

        applyFocus(state.layout, {
          workspace: inserted.workspace,
          column: inserted.column,
          item: inserted.item,
        });
      });
    },

    removeItem: (itemId) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        const removedColumnIndex = location.workspace.columns.findIndex(
          (column) => column.id === location.column.id
        );

        removeItemFromLayout(state.layout, itemId);
        normalizeLayout(state.layout);

        const neighbor =
          getFocusAfterRemoval(
            state.layout,
            location.workspace.id,
            location.column.id,
            removedColumnIndex,
            location.itemIndex
          ) ?? firstFocusTarget(state.layout);

        applyFocus(state.layout, neighbor);
      });
    },

    replaceItem: (itemId, ref) => {
      set((state) => {
        const location = findItemLocation(state.layout, itemId);
        if (!location) {
          return;
        }

        location.item.ref = ref;

        normalizeLayout(state.layout);
        const nextLocation = findItemLocation(state.layout, itemId);
        if (!nextLocation) {
          return;
        }

        applyFocus(state.layout, {
          workspace: nextLocation.workspace,
          column: nextLocation.column,
          item: nextLocation.item,
        });
      });
    },

    focusNeighbor: (horizontal, vertical) => {
      set((state) => {
        const focused = getFocusedTarget(state.layout);
        if (!focused) {
          const target = firstFocusTarget(state.layout);
          if (target) {
            applyFocus(state.layout, target);
          }
          return;
        }

        const target = getNeighborTarget(
          state.layout,
          focused.item.id,
          horizontal,
          vertical
        );
        if (!target) {
          return;
        }

        applyFocus(state.layout, target);
      });
    },

    setColumnWidths: (widths) => {
      set((state) => {
        for (const workspace of state.layout.workspaces) {
          for (const column of workspace.columns) {
            const width = widths[column.id];
            if (width !== undefined) {
              column.preferredWidth = clampPreferredWidth(width);
            }
          }
        }
      });
    },

    setItemHeights: (heights) => {
      set((state) => {
        for (const workspace of state.layout.workspaces) {
          for (const column of workspace.columns) {
            for (const item of column.items) {
              const height = heights[item.id];
              if (height !== undefined) {
                item.preferredHeight = clampPreferredHeight(height);
              }
            }
          }
        }
      });
    },

    moveColumn: (columnId, toWorkspaceId, index) => {
      set((state) => {
        const source = findColumnIndex(state.layout, columnId);
        const destinationWorkspaceIndex = workspaceIndexById(
          state.layout,
          toWorkspaceId
        );
        if (!source || destinationWorkspaceIndex < 0) {
          return;
        }

        const movedColumn = source.column;
        source.workspace.columns.splice(source.index, 1);

        const destinationWorkspace =
          state.layout.workspaces[destinationWorkspaceIndex];
        const adjustedIndex =
          source.workspace.id === destinationWorkspace.id &&
          source.index < index
            ? index - 1
            : index;
        const insertAt = clampIndex(
          adjustedIndex,
          destinationWorkspace.columns.length
        );
        destinationWorkspace.columns.splice(insertAt, 0, movedColumn);

        normalizeLayout(state.layout);

        const focusedItem =
          movedColumn.items.find(
            (item) => item.id === movedColumn.focusedItemId
          ) ?? movedColumn.items[0];
        if (!focusedItem) {
          return;
        }

        const movedColumnLocation = findColumnById(
          state.layout,
          movedColumn.id
        );
        if (!movedColumnLocation) {
          return;
        }

        const focusItem =
          movedColumnLocation.column.items.find(
            (item) => item.id === focusedItem.id
          ) ?? movedColumnLocation.column.items[0];
        if (!focusItem) {
          return;
        }

        applyFocus(state.layout, {
          workspace: movedColumnLocation.workspace,
          column: movedColumnLocation.column,
          item: focusItem,
        });
      });
    },

    moveItem: (itemId, toColumnId, index) => {
      set((state) => {
        const itemLocation = findItemLocation(state.layout, itemId);
        if (!itemLocation) {
          return;
        }

        const extracted = removeItemFromLayout(state.layout, itemId);
        const movedItem = extracted.item;

        if (!movedItem) {
          return;
        }

        const target = findColumnById(state.layout, toColumnId);
        if (!target) {
          return;
        }

        const insertAt = clampIndex(
          index ?? target.column.items.length,
          target.column.items.length
        );
        target.column.items.splice(insertAt, 0, movedItem);
        target.column.focusedItemId = movedItem.id;

        normalizeLayout(state.layout);
        const movedItemLocation = findItemLocation(state.layout, movedItem.id);
        if (!movedItemLocation) {
          return;
        }

        applyFocus(state.layout, {
          workspace: movedItemLocation.workspace,
          column: movedItemLocation.column,
          item: movedItemLocation.item,
        });
      });
    },

    moveItemToNewColumn: (itemId, index) => {
      set((state) => {
        const itemLocation = findItemLocation(state.layout, itemId);
        if (!itemLocation) {
          return;
        }

        const extracted = removeItemFromLayout(state.layout, itemId);
        const movedItem = extracted.item;
        if (!movedItem) {
          return;
        }

        const nextColumn = {
          ...createColumn(movedItem),
          preferredWidth: itemLocation.column.preferredWidth,
        } satisfies NiriColumn;

        const workspace = state.layout.workspaces.find(
          (candidate: NiriWorkspace) =>
            candidate.id === itemLocation.workspace.id
        );
        if (!workspace) {
          return;
        }

        const insertAt = clampIndex(
          index ?? itemLocation.itemIndex + 1,
          workspace.columns.length
        );
        workspace.columns.splice(insertAt, 0, nextColumn);

        normalizeLayout(state.layout);

        const inserted = findColumnById(state.layout, nextColumn.id);
        if (!inserted) {
          return;
        }

        applyFocus(state.layout, {
          workspace: inserted.workspace,
          column: inserted.column,
          item: inserted.column.items[0],
        });
      });
    },

    swapColumns: (columnId, otherColumnId) => {
      set((state) => {
        const first = findColumnIndex(state.layout, columnId);
        const second = findColumnIndex(state.layout, otherColumnId);
        if (!(first && second) || first.workspace.id !== second.workspace.id) {
          return;
        }

        const workspace = first.workspace;
        const temp = workspace.columns[first.index];
        workspace.columns[first.index] = workspace.columns[second.index];
        workspace.columns[second.index] = temp;

        const focused = getFocusedTarget(state.layout);
        if (focused) {
          applyFocus(state.layout, focused);
        }
      });
    },

    toggleOverview: () => {
      set((state) => {
        state.layout.isOverviewOpen = !state.layout.isOverviewOpen;
      });
    },

    toggleTabbed: () => {
      set((state) => {
        const active = getActiveColumn(state.layout);
        if (!active?.column) {
          return;
        }

        active.column.displayMode =
          active.column.displayMode === "normal" ? "tabbed" : "normal";
      });
    },
  }))
);

export function getLayoutStore() {
  return useLayoutStore.getState();
}
