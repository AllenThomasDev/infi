import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import TerminalView, {
  destroyTerminalInstance,
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

function tileLabel() {
  return "Terminal";
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
  const defaultTitle = tileLabel();
  const coordinateLabel = formatTileCoordinates(coordinates);
  const [terminalTitle, setTerminalTitle] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const title = terminalTitle?.trim() ? terminalTitle : defaultTitle;

  const focusTerminal = useCallback(() => terminalViewRef.current?.focus(), []);
  useFocusWhenSelected(item.id, focusTerminal);

  useEffect(() => {
    if (!selected) {
      terminalViewRef.current?.blur();
    }
  }, [selected]);

  const closeTerminal = useCallback(() => {
    ipc.client.terminal.kill({ id: item.id }).catch(console.error);
    destroyTerminalInstance(item.id);
    removeItem(item.id);
  }, [item.id, removeItem]);

  const handleTerminalExit = useCallback(() => {
    destroyTerminalInstance(item.id);
    removeItem(item.id);
  }, [item.id, removeItem]);

  return (
    <BaseNode
      className={className}
      label={coordinateLabel}
      onMouseDown={() => selectItem(item.id, { scroll: true })}
      selected={selected}
      style={style}
    >
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="truncate text-xs">
          {title}
        </BaseNodeHeaderTitle>
        <span
          className={`user-select-none text-[10px] ${
            isRunning ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isRunning ? "Running" : "Idle"}
        </span>
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
        <TerminalView
          onExit={handleTerminalExit}
          onRunningChange={setIsRunning}
          onTitleChange={setTerminalTitle}
          ref={terminalViewRef}
          terminalId={item.id}
        />
      </div>
    </BaseNode>
  );
}
