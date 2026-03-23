import { X } from "lucide-react";
import { useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import TerminalView from "@/components/terminal/terminal-view";
import { useTileFocusEffect } from "@/components/tiles/use-tile-focus-effect";
import { Button } from "@/components/ui/button";

interface TerminalTileContentProps {
  isFocused: boolean;
  onClose: () => void;
  terminalId: string;
  title: string;
}

export function TerminalTileContent({
  isFocused,
  onClose,
  terminalId,
  title,
}: TerminalTileContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useTileFocusEffect({
    containerRef,
    focusTarget: "textarea, input, [tabindex]",
    isFocused,
  });

  return (
    <BaseNode className="h-full w-full" selected={isFocused}>
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">{title}</BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${title}`}
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <X />
        </Button>
      </BaseNodeHeader>
      <div className="min-h-0 flex-1 cursor-text p-1" ref={containerRef}>
        <TerminalView terminalId={terminalId} />
      </div>
    </BaseNode>
  );
}
