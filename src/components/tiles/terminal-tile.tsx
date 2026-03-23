import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import TerminalView, {
  type TerminalViewHandle,
} from "@/components/terminal/terminal-view";
import { Button } from "@/components/ui/button";
import { useFocusRegistration } from "@/components/workspace/focus-registry";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

interface TerminalTileContentProps {
  className?: string;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
}

function tileLabel(item: NiriLayoutItem) {
  const suffix = item.id.split("-").at(-1)?.slice(0, 4) ?? item.id.slice(0, 4);
  return `Terminal ${suffix}`;
}

export function TerminalTileContent({
  className,
  item,
  selected,
  style,
}: TerminalTileContentProps) {
  const removeItem = useLayoutStore((state) => state.removeItem);
  const selectItem = useLayoutStore((state) => state.selectItem);
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const title = tileLabel(item);

  const handle = useMemo(
    () => ({ focus: () => terminalViewRef.current?.focus() }),
    []
  );
  useFocusRegistration(item.id, handle);

  return (
    <BaseNode
      className={className}
      onMouseDown={() => selectItem(item.id)}
      selected={selected}
      style={style}
    >
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">{title}</BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${title}`}
          onClick={() => removeItem(item.id)}
          size="icon-sm"
          variant="ghost"
        >
          <X />
        </Button>
      </BaseNodeHeader>
      <div className="min-h-0 flex-1 cursor-text p-1">
        <TerminalView ref={terminalViewRef} terminalId={item.id} />
      </div>
    </BaseNode>
  );
}
