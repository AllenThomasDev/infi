import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import type {
  FlowNode,
  TerminalFlowNode,
  WindowFlowNode,
} from "@/components/flow/types";
import { useCanvasNodeActions } from "@/components/flow/use-canvas-node-actions";
import { DeleteTerminalNodeContext } from "@/components/flow/use-delete-terminal-node";
import TerminalNode from "@/components/flow/terminal-node";
import WindowNode from "@/components/flow/window-node";
import ModeToggle from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import type { CommandHandlerMap } from "@/keybindings/types";
import { useKeybindings } from "@/keybindings/useKeybindings";

const initialNodes: WindowFlowNode[] = [
  {
    id: "source-window",
    type: "window",
    position: { x: 80, y: 120 },
    data: {
      subtitle: "Renderer viewport ready",
      title: "Main Workspace",
    },
  },
  {
    id: "preview-window",
    type: "window",
    position: { x: 420, y: 240 },
    data: {
      subtitle: "Custom node component",
      title: "Preview Panel",
    },
  },
];

const nodeTypes = {
  window: WindowNode,
  terminal: TerminalNode,
};

const TERMINAL_DEFAULT_WIDTH = 640;
const TERMINAL_DEFAULT_HEIGHT = 380;

function Canvas() {
  const [nodes, setNodes] = useNodesState<FlowNode>(initialNodes);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();
  const { resolvedTheme, toggleTheme } = useTheme();
  const {
    deleteSelectedNodes,
    deleteTerminalNode,
    groupSelectedNodes,
    hasSelectedNodes,
    onNodesChange,
    selectedGroupNodes,
    selectedGroupedNodes,
    selectedTopLevelNodes,
    selectAllNodes,
    ungroupSelectedNodes,
  } = useCanvasNodeActions({ nodes, reactFlow, setNodes });

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: FlowNode[] }) => {
      if (
        selectedNodes.length === 1 &&
        selectedNodes[0].type === "terminal"
      ) {
        const node = selectedNodes[0];
        const width = node.measured?.width ?? TERMINAL_DEFAULT_WIDTH;
        const height = node.measured?.height ?? TERMINAL_DEFAULT_HEIGHT;

        reactFlow.setCenter(
          node.position.x + width / 2,
          node.position.y + height / 2,
          { duration: 300, zoom: reactFlow.getZoom() }
        );
      }
    },
    [reactFlow]
  );

  const isInputFocused = useCallback(
    () =>
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA",
    []
  );

  const createTerminalNode = useCallback(() => {
    const terminalId = `terminal-${crypto.randomUUID()}`;
    const nodeId = `terminal-node-${crypto.randomUUID()}`;

    const center = reactFlow.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const snappedX = Math.round((center.x - TERMINAL_DEFAULT_WIDTH / 2) / 24) * 24;
    const snappedY = Math.round((center.y - TERMINAL_DEFAULT_HEIGHT / 2) / 24) * 24;

    setNodes((prev) => {
      const terminalCount = prev.filter((n) => n.type === "terminal").length;

      const terminalNode: TerminalFlowNode = {
        id: nodeId,
        type: "terminal",
        position: { x: snappedX, y: snappedY },
        style: { width: TERMINAL_DEFAULT_WIDTH, height: TERMINAL_DEFAULT_HEIGHT },
        selected: true,
        data: {
          terminalId,
          title: `Terminal ${terminalCount + 1}`,
        },
      };

      return [
        ...prev.map((n) => (n.selected ? { ...n, selected: false } : n)),
        terminalNode,
      ];
    });

  }, [reactFlow, setNodes]);

  const commandHandlers: CommandHandlerMap = {
    "canvas.fitView": () => reactFlow.fitView(),
    "canvas.zoomIn": () => reactFlow.zoomIn(),
    "canvas.zoomOut": () => reactFlow.zoomOut(),
    "canvas.selectAll": selectAllNodes,
    "canvas.deleteSelected": deleteSelectedNodes,
    "canvas.groupSelected": groupSelectedNodes,
    "canvas.ungroupSelected": ungroupSelectedNodes,
    "terminal.create": createTerminalNode,
    "theme.toggle": toggleTheme,
  };

  const getKeybindingContext = useCallback(
    () => ({
      canvasFocus: true,
      canGroupNodes:
        selectedTopLevelNodes.length >= 2 ||
        (selectedTopLevelNodes.length >= 1 &&
          (selectedGroupedNodes.length > 0 || selectedGroupNodes.length > 0)),
      canUngroupNodes: selectedGroupedNodes.length > 0,
      inputFocus: isInputFocused() || commandPaletteOpen,
      nodeSelected: hasSelectedNodes,
      terminalFocus: isInputFocused(),
    }),
    [
      commandPaletteOpen,
      hasSelectedNodes,
      isInputFocused,
      selectedGroupNodes.length,
      selectedGroupedNodes.length,
      selectedTopLevelNodes.length,
    ]
  );

  const { keybindings } = useKeybindings({
    handlers: {
      ...commandHandlers,
      "app.commandPalette": () => setCommandPaletteOpen((prev) => !prev),
    },
    context: getKeybindingContext,
  });

  return (
    <DeleteTerminalNodeContext.Provider value={deleteTerminalNode}>
      <ReactFlow
        colorMode={resolvedTheme}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        maxZoom={1.8}
        minZoom={0}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        panOnDrag={[1, 2]}
        proOptions={{ hideAttribution: true }}
        snapGrid={[24, 24]}
        snapToGrid
      >
        <Background gap={24} size={1} variant={BackgroundVariant.Dots} />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        handlers={commandHandlers}
        keybindings={keybindings}
      />
    </DeleteTerminalNodeContext.Provider>
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
