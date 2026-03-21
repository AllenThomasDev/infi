import type { Node, NodeProps } from "@xyflow/react";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";

export interface WindowNodeData extends Record<string, unknown> {
  subtitle: string;
  title: string;
}

export type WindowFlowNode = Node<WindowNodeData, "window">;

export default function WindowNode({ data }: NodeProps<WindowFlowNode>) {
  return (
    <BaseNode className="w-64 shadow-sm">
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>{data.title}</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-sm">{data.subtitle}</p>
      </BaseNodeContent>
    </BaseNode>
  );
}
