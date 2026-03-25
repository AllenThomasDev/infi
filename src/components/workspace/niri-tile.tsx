import type { CSSProperties } from "react";
import { PickerTileContent } from "@/components/tiles/picker-tile";
import { TerminalTileContent } from "@/components/tiles/terminal-tile";
import type { NiriLayoutItem } from "@/layout/layout-types";

interface NiriTileProps {
  className?: string;
  fullscreen?: boolean;
  item: NiriLayoutItem;
  selected: boolean;
  style?: CSSProperties;
}

export function NiriTile({ className, fullscreen, item, selected, style }: NiriTileProps) {
  switch (item.ref.type) {
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
          fullscreen={fullscreen}
          item={item}
          selected={selected}
          style={style}
        />
      );
    default:
      return null;
  }
}
