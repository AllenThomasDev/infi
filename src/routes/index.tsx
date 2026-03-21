import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import WindowNode, {
  type WindowFlowNode,
} from "@/components/flow/window-node";
import TerminalDrawer from "@/components/terminal/terminal-drawer";
import ToggleTheme from "@/components/toggle-theme";
import { toggleTheme } from "@/actions/theme";
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

const nodeTypes: NodeTypes = {
  window: WindowNode,
};

interface CanvasProps {
  onToggleTerminal: () => void;
  terminalOpen: boolean;
}

function Canvas({ onToggleTerminal, terminalOpen }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();

  const isInputFocused = useCallback(
    () =>
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA",
    [],
  );

  const hasSelectedNodes = useCallback(
    () => nodes.some((n) => n.selected),
    [nodes],
  );

  useKeybindings({
    handlers: {
      "canvas.fitView": () => reactFlow.fitView(),
      "canvas.zoomIn": () => reactFlow.zoomIn(),
      "canvas.zoomOut": () => reactFlow.zoomOut(),
      "canvas.selectAll": () =>
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true }))),
      "canvas.deleteSelected": () =>
        setNodes((nds) => nds.filter((n) => !n.selected)),
      "terminal.toggle": onToggleTerminal,
      "theme.toggle": () => toggleTheme(),
    },
    context: {
      canvasFocus: true,
      inputFocus: isInputFocused(),
      nodeSelected: hasSelectedNodes(),
      terminalFocus: terminalOpen,
    },
  });

  return (
    <ReactFlow
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      maxZoom={1.8}
      minZoom={0.5}
      nodes={nodes}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      panOnDrag={[1, 2]}
      proOptions={{ hideAttribution: true }}
      snapGrid={[24, 24]}
      snapToGrid
    >
      <Background gap={24} size={1} variant={BackgroundVariant.Dots} />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}

function HomePage() {
  const [terminalOpen, setTerminalOpen] = useState(false);

  const handleToggleTerminal = useCallback(() => {
    setTerminalOpen((prev) => !prev);
  }, []);

  return (
    <section className="flex h-full flex-col overflow-hidden bg-background">
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-4 right-4 z-10">
          <ToggleTheme />
        </div>
        <ReactFlowProvider>
          <Canvas
            onToggleTerminal={handleToggleTerminal}
            terminalOpen={terminalOpen}
          />
        </ReactFlowProvider>
      </div>
      <TerminalDrawer open={terminalOpen} />
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
