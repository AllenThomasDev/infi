import { NodeResizer, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import { Button } from "@/components/ui/button";
import type { TerminalFlowNode } from "@/components/flow/types";
import TerminalView from "@/components/terminal/terminal-view";
import { useTileActions } from "@/components/flow/use-tile-actions";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export default function TerminalNode({
  id,
  data,
  selected,
}: NodeProps<TerminalFlowNode>) {
  const { remove } = useTileActions();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync DOM focus with selection state
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (selected) {
      // Focus the terminal's focusable element (e.g. xterm textarea)
      const focusable = el.querySelector<HTMLElement>("textarea, input, [tabindex]");
      if (focusable && !el.contains(document.activeElement)) {
        focusable.focus();
      }
    } else if (el.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur?.();
    }
  }, [selected]);

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
            onClick={() => remove(id)}
          >
            <X />
          </Button>
        </BaseNodeHeader>
        <div ref={containerRef} className="nodrag nowheel nokey min-h-0 flex-1 cursor-text p-1">
          <TerminalView terminalId={data.terminalId} />
        </div>
      </BaseNode>
    </>
  );
}
