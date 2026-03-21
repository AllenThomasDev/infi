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
import { useCallback, useMemo } from "react";
import WindowNode, { type WindowFlowNode } from "@/components/flow/window-node";
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

function Canvas() {
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
      "theme.toggle": () => toggleTheme(),
    },
    context: {
      canvasFocus: true,
      inputFocus: isInputFocused(),
      nodeSelected: hasSelectedNodes(),
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
  return (
    <section className="relative h-full overflow-hidden bg-background">
      <div className="absolute top-4 right-4 z-10">
        <ToggleTheme />
      </div>
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
