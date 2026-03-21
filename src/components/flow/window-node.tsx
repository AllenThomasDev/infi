import type { Node, NodeProps } from "@xyflow/react";

export interface WindowNodeData extends Record<string, unknown> {
  accent: string;
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
      className="w-64 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-lg transition-all"
      style={{
        borderColor: selected
          ? data.accent
          : "color-mix(in oklab, var(--border) 100%, transparent)",
        boxShadow: selected
          ? `0 0 0 1px ${data.accent}, 0 24px 60px color-mix(in oklab, ${data.accent} 18%, transparent)`
          : "0 24px 60px color-mix(in oklab, var(--foreground) 10%, transparent)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{
          borderColor: "color-mix(in oklab, var(--border) 100%, transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
          node
        </span>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="font-medium text-base">{data.title}</p>
          <p className="text-muted-foreground text-sm">{data.subtitle}</p>
        </div>
        <div className="rounded-xl bg-muted/70 px-3 py-2 text-muted-foreground text-xs">
          Select, drag, pan, and zoom this window to verify the renderer canvas.
        </div>
      </div>
    </div>
  );
}
