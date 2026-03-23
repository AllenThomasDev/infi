import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import TerminalView, {
  type TerminalViewHandle,
} from "@/components/terminal/terminal-view";
import { Button } from "@/components/ui/button";

interface TerminalTileContentProps {
  className?: string;
  isFocused: boolean;
  onClose: () => void;
  onSelect: () => void;
  style?: CSSProperties;
  terminalId: string;
  title: string;
}

export function TerminalTileContent({
  className,
  isFocused,
  onClose,
  onSelect,
  style,
  terminalId,
  title,
}: TerminalTileContentProps) {
  const terminalViewRef = useRef<TerminalViewHandle>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      terminalViewRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isFocused]);

  return (
    <BaseNode
      className={className}
      onMouseDown={onSelect}
      selected={isFocused}
      style={style}
    >
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
      <div className="min-h-0 flex-1 cursor-text p-1">
        <TerminalView ref={terminalViewRef} terminalId={terminalId} />
      </div>
    </BaseNode>
  );
}
