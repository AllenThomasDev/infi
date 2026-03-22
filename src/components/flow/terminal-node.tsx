import type { NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import type { TerminalFlowNode } from "@/components/flow/types";
import { useNodeActions } from "@/components/flow/use-node-actions";
import { useNodeSelectionEffects } from "@/components/flow/use-node-selection-effects";
import TerminalView from "@/components/terminal/terminal-view";
import { Button } from "@/components/ui/button";

export default function TerminalNode({
  id,
  data,
  selected,
}: NodeProps<TerminalFlowNode>) {
  const { removeSelf } = useNodeActions(id);
  const containerRef = useRef<HTMLDivElement>(null);

  useNodeSelectionEffects({
    containerRef,
    focusTarget: "textarea, input, [tabindex]",
    selected,
  });

  return (
    <BaseNode className="h-full w-full" selected={selected}>
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">
          {data.title}
        </BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${data.title}`}
          className="nodrag"
          onClick={removeSelf}
          size="icon-sm"
          variant="ghost"
        >
          <X />
        </Button>
      </BaseNodeHeader>
      <div
        className="nodrag nowheel nokey min-h-0 flex-1 cursor-text p-1"
        ref={containerRef}
      >
        <TerminalView terminalId={data.terminalId} />
      </div>
    </BaseNode>
  );
}
