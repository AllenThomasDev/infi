import type { NodeProps } from "@xyflow/react";
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import type { WindowFlowNode } from "@/components/flow/types";

export default function WindowNode({
  data,
  selected,
}: NodeProps<WindowFlowNode>) {
  return (
    <BaseNode className="w-64" selected={selected}>
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle>{data.title}</BaseNodeHeaderTitle>
      </BaseNodeHeader>
      <BaseNodeContent>
        <p className="text-muted-foreground text-sm">{data.subtitle}</p>
      </BaseNodeContent>
    </BaseNode>
  );
}
