import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  ReactFlow,
  useNodesState,
} from "@xyflow/react";
import { useMemo } from "react";
import WindowNode, { type WindowFlowNode } from "@/components/flow/window-node";
import ToggleTheme from "@/components/toggle-theme";

const initialNodes: WindowFlowNode[] = [
  {
    id: "source-window",
    type: "window",
    position: { x: 80, y: 120 },
    data: {
      accent: "oklch(0.74 0.15 205)",
      subtitle: "Renderer viewport ready",
      title: "Main Workspace",
    },
  },
  {
    id: "preview-window",
    type: "window",
    position: { x: 420, y: 240 },
    data: {
      accent: "oklch(0.78 0.17 145)",
      subtitle: "Custom node component",
      title: "Preview Panel",
    },
  },
];

const nodeTypes: NodeTypes = {
  window: WindowNode,
};

function HomePage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const defaultEdgeOptions = useMemo(() => ({ selectable: false }), []);

  return (
    <section className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--background)_86%,var(--foreground)_4%),color-mix(in_oklab,var(--background)_96%,black_4%))]">
      <div className="absolute top-4 right-4 z-10">
        <ToggleTheme />
      </div>
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
        <Background
          color="color-mix(in oklab, var(--foreground) 14%, transparent)"
          gap={24}
          size={1.1}
          variant={BackgroundVariant.Dots}
        />
        <Controls position="bottom-right" showInteractive={false} />
      </ReactFlow>
    </section>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
