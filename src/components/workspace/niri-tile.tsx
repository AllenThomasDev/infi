import type { CSSProperties, KeyboardEvent } from "react";
import {
  BrowserTileContent,
  DEFAULT_BROWSER_URL,
} from "@/components/tiles/browser-tile";
import { PickerTileContent } from "@/components/tiles/picker-tile";
import { TerminalTileContent } from "@/components/tiles/terminal-tile";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { cn } from "@/utils/tailwind";

interface NiriTileProps {
  className?: string;
  isFocused: boolean;
  item: NiriLayoutItem;
  style?: CSSProperties;
}

function interactiveTileProps(onSelect: () => void) {
  return {
    onClick: onSelect,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    role: "button" as const,
    tabIndex: 0,
  };
}

function itemLabel(item: NiriLayoutItem) {
  const suffix = item.id.split("-").at(-1)?.slice(0, 4) ?? item.id.slice(0, 4);

  switch (item.ref.type) {
    case "browser":
      return `Browser ${suffix}`;
    case "picker":
      return "New Pane";
    case "terminal":
      return `Terminal ${suffix}`;
    default:
      return item.id;
  }
}

export function NiriTile({ className, isFocused, item, style }: NiriTileProps) {
  const removeItem = useLayoutStore((state) => state.removeItem);
  const replaceItem = useLayoutStore((state) => state.replaceItem);
  const selectItem = useLayoutStore((state) => state.selectItem);

  switch (item.ref.type) {
    case "browser":
      return (
        <div
          {...interactiveTileProps(() => selectItem(item.id))}
          className={cn("h-full min-h-0", className)}
          style={style}
        >
          <BrowserTileContent
            initialUrl={DEFAULT_BROWSER_URL}
            isFocused={isFocused}
            onClose={() => removeItem(item.id)}
            title={itemLabel(item)}
          />
        </div>
      );
    case "picker":
      return (
        <div
          {...interactiveTileProps(() => selectItem(item.id))}
          className={cn("h-full min-h-0", className)}
          style={style}
        >
          <PickerTileContent
            isFocused={isFocused}
            onCancel={() => removeItem(item.id)}
            onSelectType={(type) => replaceItem(item.id, { type })}
          />
        </div>
      );
    case "terminal":
      return (
        <div
          {...interactiveTileProps(() => selectItem(item.id))}
          className={cn("h-full min-h-0", className)}
          style={style}
        >
          <TerminalTileContent
            isFocused={isFocused}
            onClose={() => removeItem(item.id)}
            terminalId={item.id}
            title={itemLabel(item)}
          />
        </div>
      );
    default:
      return null;
  }
}
