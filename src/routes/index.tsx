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
import { toggleTheme } from "@/actions/theme";
import WindowNode, { type WindowFlowNode } from "@/components/flow/window-node";
import TerminalDrawer, {
  type TerminalSession,
} from "@/components/terminal/terminal-drawer";
import ToggleTheme from "@/components/toggle-theme";
import { ipc } from "@/ipc/manager";
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
  onCreateTerminal: () => void;
  terminalOpen: boolean;
}

function Canvas({ onCreateTerminal, terminalOpen }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);
  const reactFlow = useReactFlow();

  const isInputFocused = useCallback(
    () =>
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA",
    []
  );

  const hasSelectedNodes = useCallback(
    () => nodes.some((n) => n.selected),
    [nodes]
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
      "terminal.toggle": onCreateTerminal,
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

function createTerminalId() {
  return `terminal-${crypto.randomUUID()}`;
}

function HomePage() {
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const handleCreateTerminal = useCallback(() => {
    const id = createTerminalId();

    setTerminals((prev) => {
      const nextIndex = prev.length + 1;
      return [...prev, { id, title: `Terminal ${nextIndex}` }];
    });
    setActiveTerminalId(id);
  }, []);

  const handleCloseTerminal = useCallback((id: string) => {
    ipc.client.terminal.kill({ id }).catch(console.error);

    setTerminals((prev) => {
      const next = prev.filter((terminal) => terminal.id !== id);
      setActiveTerminalId((current) =>
        current === id ? (next.at(-1)?.id ?? null) : current
      );
      return next;
    });
  }, []);

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-4 right-4 z-10">
          <ToggleTheme />
        </div>
        <ReactFlowProvider>
          <Canvas
            onCreateTerminal={handleCreateTerminal}
            terminalOpen={terminals.length > 0}
          />
        </ReactFlowProvider>
      </div>
      <TerminalDrawer
        activeTerminalId={activeTerminalId}
        onCloseTerminal={handleCloseTerminal}
        terminals={terminals}
      />
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
