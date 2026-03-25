import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BaseNode } from "@/components/base-node";
import TerminalView, {
  type TerminalViewHandle,
} from "@/components/terminal/terminal-view";
import { useFocusWhenSelected } from "@/components/tiles/use-tile-focus-effect";
import { closeTile } from "@/layout/close-tile";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { useTerminalTitleStore } from "@/stores/terminal-title-store";

interface TerminalTileContentProps {
  className?: string;
  fullscreen?: boolean;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
}

export function TerminalTileContent({
  className,
  item,
  selected,
  style,
}: TerminalTileContentProps) {
  const selectItem = useLayoutStore((state) => state.selectItem);
  const setTitle = useTerminalTitleStore((state) => state.setTitle);
  const terminalTitle = useTerminalTitleStore(
    (state) => state.titles[item.id]
  );
  const terminalViewRef = useRef<TerminalViewHandle>(null);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleTerminalExit = useCallback(() => {
    closeTile(item.id, item.ref.type);
  }, [item.id, item.ref.type]);

  return (
    <BaseNode
      className={className}
      onMouseDown={() => selectItem(item.id, { scroll: true })}
      selected={selected}
      style={style}
    >
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
