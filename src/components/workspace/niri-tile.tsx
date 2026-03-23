import type { CSSProperties } from "react";
import { BrowserTileContent } from "@/components/tiles/browser-tile";
import { PickerTileContent } from "@/components/tiles/picker-tile";
import { TerminalTileContent } from "@/components/tiles/terminal-tile";
import type { NiriLayoutItem } from "@/layout/layout-types";

interface NiriTileProps {
  className?: string;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
}

export function NiriTile({ className, item, selected, style }: NiriTileProps) {
  switch (item.ref.type) {
    case "browser":
      return (
        <BrowserTileContent
          className={className}
          item={item}
          selected={selected}
          style={style}
        />
      );
    case "picker":
      return (
        <PickerTileContent
          className={className}
          item={item}
          selected={selected}
          style={style}
        />
      );
    case "terminal":
      return (
        <TerminalTileContent
          className={className}
          item={item}
          selected={selected}
          style={style}
        />
      );
    default:
      return null;
  }
}
