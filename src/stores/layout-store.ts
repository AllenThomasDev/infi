import { create } from "zustand";
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

type ResizeMap = Record<string, number | undefined>;

interface FocusTarget {
  column: NiriColumn;
  item: NiriLayoutItem;
  workspace: NiriWorkspace;
}

interface LayoutState {
  addColumnLeft: (item: NiriLayoutItem) => void;
  addColumnRight: (item: NiriLayoutItem) => void;
  addItemAbove: (item: NiriLayoutItem) => void;
  addItemBelow: (item: NiriLayoutItem) => void;
  focusNeighbor: (horizontal: number, vertical: number) => void;
  layout: NiriCanvasLayout;
  moveColumn: (columnId: string, toWorkspaceId: string, index: number) => void;
  moveItem: (itemId: string, toColumnId: string, index?: number) => void;
  moveItemToNewColumn: (itemId: string, index?: number) => void;
  removeItem: (itemId: string) => void;
  replaceItem: (itemId: string, ref: NiriLayoutItem["ref"]) => void;
  selectItem: (itemId: string) => void;
  setColumnWidths: (widths: ResizeMap) => void;
  setItemHeights: (heights: ResizeMap) => void;
  swapColumns: (columnId: string, otherColumnId: string) => void;
  toggleOverview: () => void;
  toggleTabbed: () => void;
}

function createWorkspace(id = crypto.randomUUID()): NiriWorkspace {
  return { id, columns: [] };
}

function createColumn(item: NiriLayoutItem): NiriColumn {
  return {
    id: crypto.randomUUID(),
    items: [item],
    focusedItemId: item.id,
    displayMode: "normal",
  };
}

function createInitialLayout(): NiriCanvasLayout {
  const workspace = createWorkspace();
  return {
    workspaces: [workspace],
    camera: {
      activeWorkspaceId: workspace.id,
    },
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
  return {
    ...layout,
    workspaces: layout.workspaces.map((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((column) => {
        if (!(target && column.id === target.column.id)) {
          return column;
        }

        return {
          ...column,
          focusedItemId: target.item.id,
        };
      }),
    })),
    camera: target
      ? {
          activeWorkspaceId: target.workspace.id,
          activeColumnId: target.column.id,
          focusedItemId: target.item.id,
        }
      : {
          activeWorkspaceId: layout.workspaces[0]?.id,
        },
  } satisfies NiriCanvasLayout;
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

  const targetColumnIndex =
    currentColumnIndex >= 0
      ? Math.min(currentColumnIndex, nextWorkspace.columns.length - 1)
      : 0;
  const targetColumn = nextWorkspace.columns[targetColumnIndex];

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
  const movedItem = findItemLocation(layout, itemId)?.item ?? null;

  const nextLayout = {
    ...layout,
    workspaces: layout.workspaces.map((workspace) => ({
      ...workspace,
      columns: workspace.columns.map((column) => {
        if (!column.items.some((item) => item.id === itemId)) {
          return column;
        }

        const items = column.items.filter((item) => item.id !== itemId);

        return {
          ...column,
          items,
          focusedItemId:
            column.focusedItemId === itemId ? undefined : column.focusedItemId,
        };
      }),
    })),
  } satisfies NiriCanvasLayout;

  return { layout: nextLayout, item: movedItem };
}

function normalizeLayout(layout: NiriCanvasLayout) {
  const workspaces = layout.workspaces
    .map((workspace) => ({
      ...workspace,
      columns: workspace.columns.filter((column) => column.items.length > 0),
    }))
    .filter((workspace) => workspace.columns.length > 0);

  return {
    ...layout,
    workspaces: workspaces.length > 0 ? workspaces : [createWorkspace()],
  } satisfies NiriCanvasLayout;
}

function insertColumn(
  layout: NiriCanvasLayout,
  item: NiriLayoutItem,
  offset: number
) {
  const active = getActiveColumn(layout);
  const workspace =
    active?.workspace ?? layout.workspaces[0] ?? createWorkspace();
  const nextColumn = createColumn(item);
  const activeIndex = active?.column
    ? workspace.columns.findIndex((column) => column.id === active.column?.id)
    : workspace.columns.length - 1;
  const insertAt =
    activeIndex >= 0
      ? clampIndex(activeIndex + offset, workspace.columns.length)
      : workspace.columns.length;
  const workspaces = (
    layout.workspaces.length > 0 ? layout.workspaces : [workspace]
  ).map((currentWorkspace) =>
    currentWorkspace.id === workspace.id
      ? {
          ...currentWorkspace,
          columns: [
            ...currentWorkspace.columns.slice(0, insertAt),
            nextColumn,
            ...currentWorkspace.columns.slice(insertAt),
          ],
        }
      : currentWorkspace
  );

  return applyFocus(
    { ...layout, workspaces },
    { workspace, column: nextColumn, item }
  );
}

function insertItemInActiveColumn(
  layout: NiriCanvasLayout,
  item: NiriLayoutItem,
  offset: number
) {
  const active = getActiveColumn(layout);
  if (!active?.column) {
    return insertColumn(layout, item, 1);
  }

  const focusedIndex = active.column.items.findIndex(
    (candidate) => candidate.id === layout.camera.focusedItemId
  );
  const baseIndex =
    focusedIndex >= 0 ? focusedIndex : active.column.items.length - 1;
  const insertAt =
    offset < 0
      ? clampIndex(baseIndex, active.column.items.length)
      : clampIndex(baseIndex + 1, active.column.items.length);

  return applyFocus(
    {
      ...layout,
      workspaces: layout.workspaces.map((workspace) =>
        workspace.id === active.workspace.id
          ? {
              ...workspace,
              columns: workspace.columns.map((column) =>
                column.id === active.column?.id
                  ? {
                      ...column,
                      items: [
                        ...column.items.slice(0, insertAt),
                        item,
                        ...column.items.slice(insertAt),
                      ],
                      focusedItemId: item.id,
                    }
                  : column
              ),
            }
          : workspace
      ),
    },
    { workspace: active.workspace, column: active.column, item }
  );
}

export const useLayoutStore = create<LayoutState>((set) => ({
  layout: createInitialLayout(),

  selectItem: (itemId) => {
    set((state) => {
      const location = findItemLocation(state.layout, itemId);
      if (!location) {
        return state;
      }

      return {
        layout: applyFocus(state.layout, {
          workspace: location.workspace,
          column: location.column,
          item: location.item,
        }),
      };
    });
  },

  addColumnLeft: (item) => {
    set((state) => ({
      layout: insertColumn(state.layout, item, 0),
    }));
  },

  addColumnRight: (item) => {
    set((state) => ({
      layout: insertColumn(state.layout, item, 1),
    }));
  },

  addItemAbove: (item) => {
    set((state) => ({
      layout: insertItemInActiveColumn(state.layout, item, -1),
    }));
  },

  addItemBelow: (item) => {
    set((state) => ({
      layout: insertItemInActiveColumn(state.layout, item, 1),
    }));
  },

  removeItem: (itemId) => {
    set((state) => {
      const currentLayout = state.layout;
      const location = findItemLocation(currentLayout, itemId);
      if (!location) {
        return state;
      }
      const removedColumnIndex = location.workspace.columns.findIndex(
        (column) => column.id === location.column.id
      );

      const nextLayout = normalizeLayout({
        ...currentLayout,
        workspaces: currentLayout.workspaces.map((workspace) => ({
          ...workspace,
          columns: workspace.columns.map((column) =>
            column.id === location.column.id
              ? {
                  ...column,
                  items: column.items.filter((item) => item.id !== itemId),
                  focusedItemId:
                    column.focusedItemId === itemId
                      ? undefined
                      : column.focusedItemId,
                }
              : column
          ),
        })),
      });

      const neighbor =
        getFocusAfterRemoval(
          nextLayout,
          location.workspace.id,
          location.column.id,
          removedColumnIndex,
          location.itemIndex
        ) ?? firstFocusTarget(nextLayout);

      return {
        layout: applyFocus(nextLayout, neighbor),
      };
    });
  },

  replaceItem: (itemId, ref) => {
    set((state) => {
      const location = findItemLocation(state.layout, itemId);
      if (!location) {
        return state;
      }

      const nextLayout = {
        ...state.layout,
        workspaces: state.layout.workspaces.map((workspace) => ({
          ...workspace,
          columns: workspace.columns.map((column) =>
            column.id === location.column.id
              ? {
                  ...column,
                  items: column.items.map((item) =>
                    item.id === itemId ? { ...item, ref } : item
                  ),
                }
              : column
          ),
        })),
      } satisfies NiriCanvasLayout;

      return {
        layout: applyFocus(nextLayout, {
          workspace: location.workspace,
          column: location.column,
          item: { ...location.item, ref },
        }),
      };
    });
  },

  focusNeighbor: (horizontal, vertical) => {
    set((state) => {
      const focused = getFocusedTarget(state.layout);
      if (!focused) {
        const target = firstFocusTarget(state.layout);
        return target ? { layout: applyFocus(state.layout, target) } : state;
      }

      const target = getNeighborTarget(
        state.layout,
        focused.item.id,
        horizontal,
        vertical
      );
      if (!target) {
        return state;
      }

      return {
        layout: applyFocus(state.layout, target),
      };
    });
  },

  setColumnWidths: (widths) => {
    set((state) => ({
      layout: {
        ...state.layout,
        workspaces: state.layout.workspaces.map((workspace) => ({
          ...workspace,
          columns: workspace.columns.map((column) => {
            const width = widths[column.id];
            if (width === undefined) {
              return column;
            }

            return {
              ...column,
              preferredWidth: clampPreferredWidth(width),
            };
          }),
        })),
      },
    }));
  },

  setItemHeights: (heights) => {
    set((state) => ({
      layout: {
        ...state.layout,
        workspaces: state.layout.workspaces.map((workspace) => ({
          ...workspace,
          columns: workspace.columns.map((column) => ({
            ...column,
            items: column.items.map((item) => {
              const height = heights[item.id];
              if (height === undefined) {
                return item;
              }

              return {
                ...item,
                preferredHeight: clampPreferredHeight(height),
              };
            }),
          })),
        })),
      },
    }));
  },

  moveColumn: (columnId, toWorkspaceId, index) => {
    set((state) => {
      const source = findColumnIndex(state.layout, columnId);
      const destinationWorkspaceIndex = workspaceIndexById(
        state.layout,
        toWorkspaceId
      );
      if (!source || destinationWorkspaceIndex < 0) {
        return state;
      }

      const destinationWorkspace =
        state.layout.workspaces[destinationWorkspaceIndex];
      const movedColumn = source.column;
      const layoutWithoutColumn = {
        ...state.layout,
        workspaces: state.layout.workspaces.map((workspace) => ({
          ...workspace,
          columns:
            workspace.id === source.workspace.id
              ? workspace.columns.filter((column) => column.id !== columnId)
              : workspace.columns,
        })),
      } satisfies NiriCanvasLayout;
      const destinationAfterRemoval =
        layoutWithoutColumn.workspaces[destinationWorkspaceIndex];
      const insertAt = clampIndex(
        index,
        destinationAfterRemoval.columns.length
      );
      const nextLayout = normalizeLayout({
        ...layoutWithoutColumn,
        workspaces: layoutWithoutColumn.workspaces.map((workspace) =>
          workspace.id === destinationWorkspace.id
            ? {
                ...workspace,
                columns: [
                  ...workspace.columns.slice(0, insertAt),
                  movedColumn,
                  ...workspace.columns.slice(insertAt),
                ],
              }
            : workspace
        ),
      });

      const focusedItem =
        movedColumn.items.find(
          (item) => item.id === movedColumn.focusedItemId
        ) ?? movedColumn.items[0];
      if (!focusedItem) {
        return { layout: nextLayout };
      }

      const movedColumnLocation = findColumnById(nextLayout, movedColumn.id);
      if (!movedColumnLocation) {
        return { layout: nextLayout };
      }

      return {
        layout: applyFocus(nextLayout, {
          workspace: movedColumnLocation.workspace,
          column: movedColumnLocation.column,
          item:
            movedColumnLocation.column.items.find(
              (item) => item.id === focusedItem.id
            ) ?? movedColumnLocation.column.items[0],
        }),
      };
    });
  },

  moveItem: (itemId, toColumnId, index) => {
    set((state) => {
      const itemLocation = findItemLocation(state.layout, itemId);
      if (!itemLocation) {
        return state;
      }

      const extracted = removeItemFromLayout(state.layout, itemId);
      const layoutWithoutItem = extracted.layout;
      const movedItem = extracted.item;

      if (!movedItem) {
        return state;
      }

      const target = findColumnById(layoutWithoutItem, toColumnId);
      const targetWorkspace = target?.workspace ?? null;
      const targetColumn = target?.column ?? null;

      if (!(targetWorkspace && targetColumn)) {
        return state;
      }

      const insertAt = clampIndex(
        index ?? targetColumn.items.length,
        targetColumn.items.length
      );
      const layoutWithInsertedItem = {
        ...layoutWithoutItem,
        workspaces: layoutWithoutItem.workspaces.map((workspace) =>
          workspace.id === targetWorkspace?.id
            ? {
                ...workspace,
                columns: workspace.columns.map((column) =>
                  column.id === targetColumn?.id
                    ? {
                        ...column,
                        items: [
                          ...column.items.slice(0, insertAt),
                          movedItem,
                          ...column.items.slice(insertAt),
                        ],
                        focusedItemId: movedItem.id,
                      }
                    : column
                ),
              }
            : workspace
        ),
      } satisfies NiriCanvasLayout;
      const normalizedLayout = normalizeLayout(layoutWithInsertedItem);
      const movedItemLocation = findItemLocation(
        normalizedLayout,
        movedItem.id
      );
      if (!movedItemLocation) {
        return state;
      }

      const nextLayout = applyFocus(normalizedLayout, {
        workspace: movedItemLocation.workspace,
        column: movedItemLocation.column,
        item: movedItemLocation.item,
      });

      return { layout: nextLayout };
    });
  },

  moveItemToNewColumn: (itemId, index) => {
    set((state) => {
      const itemLocation = findItemLocation(state.layout, itemId);
      if (!itemLocation) {
        return state;
      }

      const extracted = removeItemFromLayout(state.layout, itemId);
      if (!extracted.item) {
        return state;
      }

      const nextColumn = {
        ...createColumn(extracted.item),
        preferredWidth: itemLocation.column.preferredWidth,
      } satisfies NiriColumn;
      const insertAt = clampIndex(
        index ?? itemLocation.itemIndex + 1,
        itemLocation.workspace.columns.length
      );
      const nextLayout = normalizeLayout({
        ...extracted.layout,
        workspaces: extracted.layout.workspaces.map((workspace) =>
          workspace.id === itemLocation.workspace.id
            ? {
                ...workspace,
                columns: [
                  ...workspace.columns.slice(0, insertAt),
                  nextColumn,
                  ...workspace.columns.slice(insertAt),
                ],
              }
            : workspace
        ),
      });

      const inserted = findColumnById(nextLayout, nextColumn.id);
      if (!inserted) {
        return state;
      }

      return {
        layout: applyFocus(nextLayout, {
          workspace: inserted.workspace,
          column: inserted.column,
          item: inserted.column.items[0],
        }),
      };
    });
  },

  swapColumns: (columnId, otherColumnId) => {
    set((state) => {
      const first = findColumnIndex(state.layout, columnId);
      const second = findColumnIndex(state.layout, otherColumnId);
      if (!(first && second) || first.workspace.id !== second.workspace.id) {
        return state;
      }

      const nextLayout = {
        ...state.layout,
        workspaces: state.layout.workspaces.map((workspace) => {
          if (workspace.id === first.workspace.id) {
            const columns = [...workspace.columns];
            columns[first.index] = second.column;
            columns[second.index] = first.column;
            return { ...workspace, columns };
          }

          return workspace;
        }),
      } satisfies NiriCanvasLayout;
      const focused = getFocusedTarget(nextLayout);

      return {
        layout: focused ? applyFocus(nextLayout, focused) : nextLayout,
      };
    });
  },

  toggleOverview: () => {
    set((state) => ({
      layout: {
        ...state.layout,
        isOverviewOpen: !state.layout.isOverviewOpen,
      },
    }));
  },

  toggleTabbed: () => {
    set((state) => {
      const active = getActiveColumn(state.layout);
      if (!active?.column) {
        return state;
      }

      return {
        layout: {
          ...state.layout,
          workspaces: state.layout.workspaces.map((workspace) =>
            workspace.id === active.workspace.id
              ? {
                  ...workspace,
                  columns: workspace.columns.map((column) =>
                    column.id === active.column?.id
                      ? {
                          ...column,
                          displayMode:
                            column.displayMode === "normal"
                              ? "tabbed"
                              : "normal",
                        }
                      : column
                  ),
                }
              : workspace
          ),
        },
      };
    });
  },
}));

export function getLayoutStore() {
  return useLayoutStore.getState();
}
