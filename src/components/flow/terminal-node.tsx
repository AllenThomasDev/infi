import type { NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import type { TerminalFlowNode } from "@/components/flow/types";
import { useTileActions } from "@/components/flow/use-tile-actions";
import TerminalView from "@/components/terminal/terminal-view";
import { Button } from "@/components/ui/button";

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
    if (!el) {
      return;
    }
    if (selected) {
      // Focus the terminal's focusable element (e.g. xterm textarea)
      const focusable = el.querySelector<HTMLElement>(
        "textarea, input, [tabindex]"
      );
      if (focusable && !el.contains(document.activeElement)) {
        focusable.focus();
      }
    } else if (el.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur?.();
    }
  }, [selected]);

  return (
    <BaseNode className="h-full w-full" selected={selected}>
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">
          {data.title}
        </BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${data.title}`}
          className="nodrag"
          onClick={() => remove(id)}
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
