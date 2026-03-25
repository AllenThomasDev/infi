import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import { EmptyCanvasState } from "@/components/workspace/empty-canvas-state";
import { NiriRenderer } from "@/components/workspace/niri-renderer";
import { WorkspaceContext } from "@/components/workspace/workspace-context";
import { closeTile } from "@/layout/close-tile";
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
  onKeybindingStateChange: (state: CanvasKeybindingState | null) => void;
}

export function Canvas({
  branchPickerOpen,
  canvasId,
  commandPaletteOpen,
  directory,
  onKeybindingStateChange,
}: CanvasProps) {
  const layout = useLayoutStore((state) => state.layout);
  const addItem = useLayoutStore((state) => state.addItem);
  const addRowBelow = useLayoutStore((state) => state.addRowBelow);

  const focusNeighbor = useLayoutStore((state) => state.focusNeighbor);
  const focusNextItem = useLayoutStore((state) => state.focusNextItem);
  const focusPrevItem = useLayoutStore((state) => state.focusPrevItem);
  const toggleFullscreenMode = useLayoutStore((state) => state.toggleFullscreenMode);
  const toggleOverview = useLayoutStore((state) => state.toggleOverview);
  const { toggleTheme } = useTheme();

  const canvasHandlers = useMemo<CommandHandlerMap>(
    () => ({
      "canvas.fitView": NOOP,
      "canvas.fullscreenNode": toggleFullscreenMode,
      "canvas.selectAll": NOOP,
      "canvas.deleteSelected": () => {
        const store = useLayoutStore.getState();
        const focused = getFocusedLocation(store.layout);
        if (!focused) {
          return;
        }

        closeTile(focused.item.id, focused.item.ref.type);
      },
      "tiling.addRight": () => addItem(createLayoutItem({ type: "terminal" })),
      "tiling.addBelow": () =>
        addRowBelow(createLayoutItem({ type: "terminal" })),
      "tiling.focusLeft": () => focusNeighbor(-1, 0),
      "tiling.focusRight": () => focusNeighbor(1, 0),
      "tiling.focusUp": () => focusNeighbor(0, -1),
      "tiling.focusDown": () => focusNeighbor(0, 1),
      "tiling.moveLeft": () => moveFocusedItem(-1, 0),
      "tiling.moveRight": () => moveFocusedItem(1, 0),
      "tiling.moveUp": () => moveFocusedItem(0, -1),
      "tiling.moveDown": () => moveFocusedItem(0, 1),
      "tiling.focusNextItem": focusNextItem,
      "tiling.focusPrevItem": focusPrevItem,
      "tiling.toggleOverview": toggleOverview,
      "theme.toggle": toggleTheme,
    }),
    [
      addItem,
      addRowBelow,
      focusNeighbor,
      focusNextItem,
      focusPrevItem,
      toggleFullscreenMode,
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
    onKeybindingStateChange(keybindingState);
    return () => onKeybindingStateChange(null);
  }, [keybindingState, onKeybindingStateChange]);

  if (layout.rows.length === 0) {
    return (
      <WorkspaceContext.Provider value={{ directory }}>
        <EmptyCanvasState
          actionCommand="tiling.addRight"
          actionLabel="Add Tile"
          description="This canvas is empty. Add a tile to start working here."
          onAction={() => addItem(createLayoutItem({ type: "picker" }))}
          title="No tiles yet"
        />
      </WorkspaceContext.Provider>
    );
  }

  return (
    <WorkspaceContext.Provider value={{ directory }}>
      <NiriRenderer layout={layout} />
    </WorkspaceContext.Provider>
  );
}
