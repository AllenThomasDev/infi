import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import { NiriRenderer } from "@/components/workspace/niri-renderer";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import type {
  CommandHandlerMap,
  ShortcutMatchContext,
} from "@/keybindings/types";
import type {
  NiriCanvasLayout,
  NiriItemRef,
  NiriLayoutItem,
} from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

function isInputFocused() {
  return (
    document.activeElement?.tagName === "INPUT" ||
    document.activeElement?.tagName === "TEXTAREA"
  );
}

interface LayoutLocation {
  column: NiriCanvasLayout["workspaces"][number]["columns"][number];
  columnIndex: number;
  item: NiriLayoutItem;
  itemIndex: number;
  workspace: NiriCanvasLayout["workspaces"][number];
}

function getFocusedLocation(layout: NiriCanvasLayout): LayoutLocation | null {
  const focusedId = layout.camera.focusedItemId;

  for (const workspace of layout.workspaces) {
    const columnIndex = workspace.columns.findIndex((column) =>
      column.items.some((item) => item.id === focusedId)
    );
    if (columnIndex < 0) {
      continue;
    }

    const column = workspace.columns[columnIndex];
    const itemIndex = column.items.findIndex((item) => item.id === focusedId);
    return {
      workspace,
      column,
      columnIndex,
      item: column.items[itemIndex],
      itemIndex,
    };
  }

  const workspace =
    layout.workspaces.find(
      (candidate) => candidate.id === layout.camera.activeWorkspaceId
    ) ?? layout.workspaces[0];
  const column = workspace?.columns[0];
  const item = column?.items[0];
  if (!(workspace && column && item)) {
    return null;
  }

  return {
    workspace,
    column,
    columnIndex: 0,
    item,
    itemIndex: 0,
  };
}

function createLayoutItem(ref: NiriItemRef): NiriLayoutItem {
  return {
    id: `${ref.type}-item-${crypto.randomUUID()}`,
    ref,
  };
}

const NOOP = () => undefined;

function moveFocusedItem(horizontal: number, vertical: number) {
  const store = useLayoutStore.getState();
  const focused = getFocusedLocation(store.layout);
  if (!focused) {
    return;
  }

  if (vertical !== 0) {
    const targetIndex = focused.itemIndex + vertical;
    if (targetIndex < 0 || targetIndex >= focused.column.items.length) {
      return;
    }

    store.moveItem(focused.item.id, focused.column.id, targetIndex);
    return;
  }

  if (horizontal === 0) {
    return;
  }

  if (focused.column.items.length === 1) {
    const targetIndex = focused.columnIndex + horizontal;
    if (targetIndex < 0 || targetIndex >= focused.workspace.columns.length) {
      return;
    }

    store.moveColumn(focused.column.id, focused.workspace.id, targetIndex);
    return;
  }

  const targetIndex = focused.columnIndex + (horizontal > 0 ? 1 : 0);
  store.moveItemToNewColumn(focused.item.id, targetIndex);
}

export interface CanvasKeybindingState {
  context: () => Partial<ShortcutMatchContext>;
  handlers: CommandHandlerMap;
}

interface CanvasProps {
  branchPickerOpen: boolean;
  commandPaletteOpen: boolean;
  directory?: string;
  isActive?: boolean;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function Canvas({
  branchPickerOpen,
  commandPaletteOpen,
  directory,
  isActive = true,
  onKeybindingStateChange,
}: CanvasProps) {
  const focusedItemId = useLayoutStore(
    (state) => state.layout.camera.focusedItemId
  );
  const addColumnRight = useLayoutStore((state) => state.addColumnRight);
  const addItemBelow = useLayoutStore((state) => state.addItemBelow);
  const addWorkspaceBelow = useLayoutStore((state) => state.addWorkspaceBelow);
  const removeItem = useLayoutStore((state) => state.removeItem);
  const focusNeighbor = useLayoutStore((state) => state.focusNeighbor);
  const toggleOverview = useLayoutStore((state) => state.toggleOverview);
  const toggleTabbed = useLayoutStore((state) => state.toggleTabbed);
  const { toggleTheme } = useTheme();

  const canvasHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "canvas.fitView": NOOP,
      "canvas.fullscreenNode": NOOP,
      "canvas.zoomIn": NOOP,
      "canvas.zoomOut": NOOP,
      "canvas.selectAll": NOOP,
      "canvas.deleteSelected": () => {
        if (focusedItemId) {
          removeItem(focusedItemId);
        }
      },
      "tiling.addRight": () =>
        addColumnRight(createLayoutItem({ type: "picker" })),
      "tiling.addBelow": () =>
        addItemBelow(createLayoutItem({ type: "picker" })),
      "tiling.addWorkspaceBelow": () =>
        addWorkspaceBelow(createLayoutItem({ type: "picker" })),
      "tiling.focusLeft": () => focusNeighbor(-1, 0),
      "tiling.focusRight": () => focusNeighbor(1, 0),
      "tiling.focusUp": () => focusNeighbor(0, -1),
      "tiling.focusDown": () => focusNeighbor(0, 1),
      "tiling.moveLeft": () => moveFocusedItem(-1, 0),
      "tiling.moveRight": () => moveFocusedItem(1, 0),
      "tiling.moveUp": () => moveFocusedItem(0, -1),
      "tiling.moveDown": () => moveFocusedItem(0, 1),
      "tiling.toggleOverview": toggleOverview,
      "tiling.toggleTabbed": toggleTabbed,
      "theme.toggle": toggleTheme,
    }),
    [
      addColumnRight,
      addItemBelow,
      addWorkspaceBelow,
      focusNeighbor,
      focusedItemId,
      removeItem,
      toggleOverview,
      toggleTabbed,
      toggleTheme,
    ]
  );

  const getKeybindingContext = useCallback(() => {
    const focused = getFocusedLocation(useLayoutStore.getState().layout);
    const selectedType = focused?.item.ref.type;

    return {
      browserSelected: selectedType === "browser",
      canvasFocus: true,
      inputFocus: isInputFocused() || commandPaletteOpen || branchPickerOpen,
      pickerSelected: selectedType === "picker",
      terminalSelected: selectedType === "terminal",
      windowSelected: false,
    };
  }, [branchPickerOpen, commandPaletteOpen]);

  const keybindingState = useMemo<CanvasKeybindingState>(
    () => ({
      context: getKeybindingContext,
      handlers: canvasHandlers,
    }),
    [canvasHandlers, getKeybindingContext]
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    onKeybindingStateChange(keybindingState);
    return () => onKeybindingStateChange(null);
  }, [isActive, keybindingState, onKeybindingStateChange]);

  return (
    <WorkspaceContext.Provider value={{ directory }}>
      <NiriRenderer />
    </WorkspaceContext.Provider>
  );
}
