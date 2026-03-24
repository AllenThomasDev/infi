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
import { useTerminalTitleStore } from "@/stores/terminal-title-store";

interface TerminalTileContentProps {
  className?: string;
  coordinates: TileCoordinates;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
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
  const setTitle = useTerminalTitleStore((state) => state.setTitle);
  const removeTitle = useTerminalTitleStore((state) => state.removeTitle);
  const terminalTitle = useTerminalTitleStore(
    (state) => state.titles[item.id]
  );
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const coordinateLabel = formatTileCoordinates(coordinates);
  const [isRunning, setIsRunning] = useState(false);
  const title = terminalTitle?.trim() || "Terminal";

  const focusTerminal = useCallback(() => terminalViewRef.current?.focus(), []);
  useFocusWhenSelected(item.id, focusTerminal);

  useEffect(() => {
    if (!selected) {
      terminalViewRef.current?.blur();
    }
  }, [selected]);

  const titleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const titleCountRef = useRef(0);
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      clearTimeout(titleTimerRef.current);
      titleCountRef.current += 1;
      if (titleCountRef.current <= 1) {
        return;
      }
      titleTimerRef.current = setTimeout(() => setTitle(item.id, newTitle), 150);
    },
    [item.id, setTitle]
  );
  useEffect(() => () => clearTimeout(titleTimerRef.current), []);

  const closeTerminal = useCallback(() => {
    ipc.client.terminal.kill({ id: item.id }).catch(console.error);
    destroyTerminalInstance(item.id);
    removeTitle(item.id);
    removeItem(item.id);
  }, [item.id, removeItem, removeTitle]);

  const handleTerminalExit = useCallback(() => {
    destroyTerminalInstance(item.id);
    removeTitle(item.id);
    removeItem(item.id);
  }, [item.id, removeItem, removeTitle]);

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
          onTitleChange={handleTitleChange}
          ref={terminalViewRef}
          terminalId={item.id}
        />
      </div>
    </BaseNode>
  );
}
