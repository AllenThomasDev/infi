import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useRef } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import TerminalView, {
  type TerminalViewHandle,
} from "@/components/terminal/terminal-view";
import {
  formatTileCoordinates,
  type TileCoordinates,
} from "@/components/tiles/tile-coordinates";
import { useFocusWhenSelected } from "@/components/tiles/use-tile-focus-effect";
import { Button } from "@/components/ui/button";
import { ipc } from "@/ipc/manager";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

interface TerminalTileContentProps {
  className?: string;
  coordinates: TileCoordinates;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
}

function tileLabel(item: NiriLayoutItem, coordinates: TileCoordinates) {
  const suffix = item.id.split("-").at(-1)?.slice(0, 4) ?? item.id.slice(0, 4);
  return `Terminal ${suffix} ${formatTileCoordinates(coordinates)}`;
}

export function TerminalTileContent({
  className,
  coordinates,
  item,
  selected,
  style,
}: TerminalTileContentProps) {
  const removeItem = useLayoutStore((state) => state.removeItem);
  const selectItem = useLayoutStore((state) => state.selectItem);
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const title = tileLabel(item, coordinates);

  const focusTerminal = useCallback(() => terminalViewRef.current?.focus(), []);
  useFocusWhenSelected(item.id, focusTerminal);

  const closeTerminal = useCallback(() => {
    ipc.client.terminal.kill({ id: item.id }).catch(console.error);
    removeItem(item.id);
  }, [item.id, removeItem]);

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
          onClick={closeTerminal}
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
