import type { CSSProperties } from "react";
import {
  BrowserTileContent,
  DEFAULT_BROWSER_URL,
} from "@/components/tiles/browser-tile";
import { PickerTileContent } from "@/components/tiles/picker-tile";
import { TerminalTileContent } from "@/components/tiles/terminal-tile";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

interface NiriTileProps {
  className?: string;
  isFocused: boolean;
  item: NiriLayoutItem;
  style?: CSSProperties;
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
        <BrowserTileContent
          className={className}
          initialUrl={DEFAULT_BROWSER_URL}
          isFocused={isFocused}
          onClose={() => removeItem(item.id)}
          onSelect={() => selectItem(item.id)}
          style={style}
          title={itemLabel(item)}
        />
      );
    case "picker":
      return (
        <PickerTileContent
          className={className}
          isFocused={isFocused}
          onCancel={() => removeItem(item.id)}
          onSelect={() => selectItem(item.id)}
          onSelectType={(type) => replaceItem(item.id, { type })}
          style={style}
        />
      );
    case "terminal":
      return (
        <TerminalTileContent
          className={className}
          isFocused={isFocused}
          onClose={() => removeItem(item.id)}
          onSelect={() => selectItem(item.id)}
          style={style}
          terminalId={item.id}
          title={itemLabel(item)}
        />
      );
    default:
      return null;
  }
}
