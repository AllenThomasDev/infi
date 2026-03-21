import type { Node, NodeProps } from "@xyflow/react";

export interface WindowNodeData extends Record<string, unknown> {
  subtitle: string;
  title: string;
}

export type WindowFlowNode = Node<WindowNodeData, "window">;

export default function WindowNode({
  data,
  selected,
}: NodeProps<WindowFlowNode>) {
  return (
    <div
      className={`w-64 rounded-xl border bg-card p-4 shadow-sm ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
    >
      <p className="font-medium">{data.title}</p>
      <p className="text-muted-foreground text-sm">{data.subtitle}</p>
    </div>
  );
}
