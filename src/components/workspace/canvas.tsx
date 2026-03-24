import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import { NiriRenderer } from "@/components/workspace/niri-renderer";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import { ipc } from "@/ipc/manager";
import type {
  CommandHandlerMap,
  ShortcutMatchContext,
} from "@/keybindings/types";
import type {
  NiriCanvasLayout,
  NiriItemRef,
  NiriLayoutItem,
} from "@/layout/layout-types";
import { createInitialLayout, useLayoutStore } from "@/stores/layout-store";

function isInputFocused() {
  return (
    document.activeElement?.tagName === "INPUT" ||
    document.activeElement?.tagName === "TEXTAREA"
  );
}

interface LayoutLocation {
  item: NiriLayoutItem;
  itemIndex: number;
  row: NiriCanvasLayout["rows"][number];
  rowIndex: number;
}

function getFocusedLocation(layout: NiriCanvasLayout): LayoutLocation | null {
  const focusedId = layout.selectedItemId;

  for (const [rowIndex, row] of layout.rows.entries()) {
    const itemIndex = row.items.findIndex((item) => item.id === focusedId);
    if (itemIndex < 0) {
      continue;
    }

    return {
      row,
      rowIndex,
      item: row.items[itemIndex],
      itemIndex,
    };
  }

  const row =
    layout.rows.find((candidate) => candidate.items.length > 0) ??
    layout.rows[0];
  const item = row?.items[0];
  if (!(row && item)) {
    return null;
  }

  return {
    row,
    rowIndex: layout.rows.findIndex((candidate) => candidate.id === row.id),
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

const EMPTY_LAYOUT = createInitialLayout();
const NOOP = () => undefined;

function moveFocusedItem(horizontal: number, vertical: number) {
  const store = useLayoutStore.getState();
  const focused = getFocusedLocation(store.layout);
  if (!focused) {
    return;
  }

  if (vertical !== 0) {
    store.moveItemToAdjacentRow(focused.item.id, vertical > 0 ? 1 : -1);
    return;
  }

  if (horizontal === 0) {
    return;
  }

  const targetIndex = focused.itemIndex + horizontal;
  if (targetIndex < 0 || targetIndex >= focused.row.items.length) {
    return;
  }

  store.moveItem(focused.item.id, focused.row.id, targetIndex);
}

export interface CanvasKeybindingState {
  context: () => Partial<ShortcutMatchContext>;
  handlers: CommandHandlerMap;
}

interface CanvasProps {
  branchPickerOpen: boolean;
  canvasId: string;
  commandPaletteOpen: boolean;
  directory?: string;
  isActive?: boolean;
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function Canvas({
  branchPickerOpen,
  canvasId,
  commandPaletteOpen,
  directory,
  isActive = true,
  onKeybindingStateChange,
}: CanvasProps) {
  const layout = useLayoutStore((state) =>
    isActive ? state.layout : (state.layoutsByCanvas[canvasId] ?? EMPTY_LAYOUT)
  );
  const addItem = useLayoutStore((state) => state.addItem);
  const addRowBelow = useLayoutStore((state) => state.addRowBelow);
  const removeItem = useLayoutStore((state) => state.removeItem);
  const focusNeighbor = useLayoutStore((state) => state.focusNeighbor);
  const toggleOverview = useLayoutStore((state) => state.toggleOverview);
  const { toggleTheme } = useTheme();

  const canvasHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "canvas.fitView": NOOP,
      "canvas.fullscreenNode": NOOP,
      "canvas.zoomIn": NOOP,
      "canvas.zoomOut": NOOP,
      "canvas.selectAll": NOOP,
      "canvas.deleteSelected": () => {
        const store = useLayoutStore.getState();
        const focused = getFocusedLocation(store.layout);
        if (!focused) {
          return;
        }

        if (focused.item.ref.type === "terminal") {
          ipc.client.terminal
            .kill({ id: focused.item.id })
            .catch(console.error);
        }

        removeItem(focused.item.id);
      },
      "tiling.addRight": () => addItem(createLayoutItem({ type: "picker" })),
      "tiling.addBelow": () =>
        addRowBelow(createLayoutItem({ type: "picker" })),
      "tiling.focusLeft": () => focusNeighbor(-1, 0),
      "tiling.focusRight": () => focusNeighbor(1, 0),
      "tiling.focusUp": () => focusNeighbor(0, -1),
      "tiling.focusDown": () => focusNeighbor(0, 1),
      "tiling.moveLeft": () => moveFocusedItem(-1, 0),
      "tiling.moveRight": () => moveFocusedItem(1, 0),
      "tiling.moveUp": () => moveFocusedItem(0, -1),
      "tiling.moveDown": () => moveFocusedItem(0, 1),
      "tiling.toggleOverview": toggleOverview,
      "theme.toggle": toggleTheme,
    }),
    [
      addItem,
      addRowBelow,
      focusNeighbor,
      removeItem,
      toggleOverview,
      toggleTheme,
    ]
  );

  const getKeybindingContext = useCallback(() => {
    const focused = getFocusedLocation(useLayoutStore.getState().layout);
    const selectedType = focused?.item.ref.type;

    return {
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
      <NiriRenderer layout={layout} />
    </WorkspaceContext.Provider>
  );
}
