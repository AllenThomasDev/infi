import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Controls,
  type OnSelectionChangeFunc,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { makeNodeFactory } from "@/components/flow/node-factories";
import PickerNode from "@/components/flow/picker-node";
import TerminalNode from "@/components/flow/terminal-node";
import type { FlowNode } from "@/components/flow/types";
import { useCanvasNodeActions } from "@/components/flow/use-canvas-node-actions";
import { TileActionsContext } from "@/components/flow/use-tile-actions";
import WindowNode from "@/components/flow/window-node";
import ModeToggle from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/useKeybindings";
import { useTilingLayout } from "@/layout/use-tiling-layout";

const nodeTypes = {
  window: WindowNode,
  terminal: TerminalNode,
  picker: PickerNode,
};

function Canvas() {
  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();
  const { resolvedTheme, toggleTheme } = useTheme();

  const { create, remove, replace, focus, move } = useTilingLayout(setNodes);

  const terminalCounterRef = useRef(0);
  const nextTerminalCount = useCallback(() => ++terminalCounterRef.current, []);
  const makeTerminalFactory = useCallback(
    () => makeNodeFactory("terminal", nextTerminalCount()),
    [nextTerminalCount]
  );
  const makePickerFactory = useCallback(() => makeNodeFactory("picker", 0), []);

  const tileActions = useMemo(
    () => ({
      remove,
      replace: (nodeId: string, type: "terminal" | "window" | "picker") =>
        replace(
          nodeId,
          makeNodeFactory(type, type === "terminal" ? nextTerminalCount() : 0)
        ),
    }),
    [nextTerminalCount, remove, replace]
  );

  const lastFocusedId = useRef<string | null>(null);
  const pendingMoveViewportId = useRef<string | null>(null);
  const fitNodeIntoView = useCallback(
    (nodeId: string) => {
      lastFocusedId.current = nodeId;
      reactFlow.fitView({
        nodes: [{ id: nodeId }],
        duration: 300,
        maxZoom: 1.4,
        padding: 0.1,
      });
    },
    [reactFlow]
  );
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: sel }) => {
      if (sel.length !== 1) {
        lastFocusedId.current = null;
        return;
      }
      if (sel[0].id === lastFocusedId.current) {
        return;
      }
      fitNodeIntoView(sel[0].id);
    },
    [fitNodeIntoView]
  );

  useEffect(() => {
    if (!pendingMoveViewportId.current) {
      return;
    }

    const selectedNode = nodes.find((node) => node.selected);
    if (!selectedNode || selectedNode.id !== pendingMoveViewportId.current) {
      return;
    }

    pendingMoveViewportId.current = null;
    fitNodeIntoView(selectedNode.id);
  }, [fitNodeIntoView, nodes]);

  const { deleteSelectedNodes, onNodesChange, selectAllNodes } =
    useCanvasNodeActions({ nodes, reactFlow, setNodes });

  const isInputFocused = useCallback(
    () =>
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA",
    []
  );

  const commandHandlers: CommandHandlerMap = {
    "canvas.fitView": () => reactFlow.fitView(),
    "canvas.zoomIn": () => reactFlow.zoomIn(),
    "canvas.zoomOut": () => reactFlow.zoomOut(),
    "canvas.selectAll": selectAllNodes,
    "canvas.deleteSelected": deleteSelectedNodes,
    "tiling.createLeft": () => create(-1, 0, makeTerminalFactory()),
    "tiling.createRight": () => create(1, 0, makeTerminalFactory()),
    "tiling.createUp": () => create(0, -1, makeTerminalFactory()),
    "tiling.createDown": () => create(0, 1, makeTerminalFactory()),
    "tiling.insertLeft": () => create(-1, 0, makePickerFactory()),
    "tiling.insertRight": () => create(1, 0, makePickerFactory()),
    "tiling.insertUp": () => create(0, -1, makePickerFactory()),
    "tiling.insertDown": () => create(0, 1, makePickerFactory()),
    "tiling.focusLeft": () => focus(-1, 0),
    "tiling.focusRight": () => focus(1, 0),
    "tiling.focusUp": () => focus(0, -1),
    "tiling.focusDown": () => focus(0, 1),
    "tiling.moveLeft": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(-1, 0);
    },
    "tiling.moveRight": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(1, 0);
    },
    "tiling.moveUp": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(0, -1);
    },
    "tiling.moveDown": () => {
      const selectedNode = nodes.find((node) => node.selected);
      if (!selectedNode) {
        return;
      }
      pendingMoveViewportId.current = selectedNode.id;
      move(0, 1);
    },
    "theme.toggle": toggleTheme,
  };

  const getKeybindingContext = useCallback(
    () => ({
      canvasFocus: true,
      inputFocus: isInputFocused() || commandPaletteOpen,
      pickerSelected: nodes.some(
        (node) => node.selected && node.type === "picker"
      ),
    }),
    [commandPaletteOpen, isInputFocused, nodes]
  );

  const { keybindings } = useKeybindings({
    handlers: {
      ...commandHandlers,
      "app.commandPalette": () => setCommandPaletteOpen((prev) => !prev),
    },
    context: getKeybindingContext,
  });

  return (
    <TileActionsContext.Provider value={tileActions}>
      <ReactFlow
        colorMode={resolvedTheme}
        defaultEdgeOptions={defaultEdgeOptions}
        maxZoom={1.8}
        minZoom={0.1}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} variant={BackgroundVariant.Dots} />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
      <CommandPalette
        handlers={commandHandlers}
        keybindings={keybindings}
        onOpenChange={setCommandPaletteOpen}
        open={commandPaletteOpen}
      />
    </TileActionsContext.Provider>
  );
}

function HomePage() {
  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
