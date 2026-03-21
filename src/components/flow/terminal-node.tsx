import { NodeResizer, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Button } from "@/components/ui/button";
import type { TerminalFlowNode } from "@/components/flow/types";
import TerminalView from "@/components/terminal/terminal-view";
import { useDeleteTerminalNode } from "@/components/flow/use-delete-terminal-node";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export default function TerminalNode({
  id,
  data,
  selected,
}: NodeProps<TerminalFlowNode>) {
  const deleteTerminalNode = useDeleteTerminalNode();

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
      />
      <BaseNode className="h-full w-full" selected={selected}>
        <BaseNodeHeader className="border-b">
          <BaseNodeHeaderTitle className="text-xs">
            {data.title}
          </BaseNodeHeaderTitle>
          <Button
            aria-label={`Close ${data.title}`}
            className="nodrag"
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteTerminalNode(id)}
          >
            <X />
          </Button>
        </BaseNodeHeader>
        <div className="nodrag nowheel nokey min-h-0 flex-1 cursor-text p-1">
          <TerminalView terminalId={data.terminalId} />
        </div>
      </BaseNode>
    </>
  );
}
