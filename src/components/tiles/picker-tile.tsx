import type { LucideIcon } from "lucide-react";
import { Plus, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import {
  formatTileCoordinates,
  type TileCoordinates,
} from "@/components/tiles/tile-coordinates";
import { useFocusWhenSelected } from "@/components/tiles/use-tile-focus-effect";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NiriLayoutItem } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { cn } from "@/utils/tailwind";

interface PickerOption {
  icon: LucideIcon;
  label: string;
  type: "terminal";
}

const PICKER_OPTIONS: PickerOption[] = [
  {
    type: "terminal",
    icon: Terminal,
    label: "Terminal",
  },
];

interface PickerTileContentProps {
  className?: string;
  coordinates: TileCoordinates;
  item: NiriLayoutItem;
  selected: boolean;
  style?: React.CSSProperties;
}

export function PickerTileContent({
  className,
  coordinates,
  item,
  selected,
  style,
}: PickerTileContentProps) {
  const removeItem = useLayoutStore((state) => state.removeItem);
  const replaceItem = useLayoutStore((state) => state.replaceItem);
  const selectItem = useLayoutStore((state) => state.selectItem);
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const cancel = useCallback(() => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    removeItem(item.id);
  }, [item.id, removeItem]);

  const confirm = useCallback(
    (type: PickerOption["type"]) => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      replaceItem(item.id, { type });
    },
    [item.id, replaceItem]
  );

  const focusInput = useCallback(() => {
    doneRef.current = false;
    const container = containerRef.current;
    const target = container?.querySelector<HTMLElement>("input");
    if (target && !container?.contains(document.activeElement)) {
      target.focus();
    }
  }, []);
  useFocusWhenSelected(item.id, focusInput);

  useEffect(() => {
    if (selected) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      containerRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
    }
  }, [selected]);

  return (
    <div
      className={cn("h-full w-full", className)}
      ref={containerRef}
      style={style}
    >
      <BaseNode
        className="h-full w-full border-primary/35 border-dashed bg-primary/5 shadow-none backdrop-blur-sm"
        onMouseDown={() => selectItem(item.id, { scroll: true })}
        selected={selected}
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.24em]">
            <Plus className="h-3.5 w-3.5" />
            New Pane {formatTileCoordinates(coordinates)}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-xl border border-primary/30 border-dashed bg-background/80 p-3 shadow-sm">
              <Command className="rounded-lg border-0 bg-transparent shadow-none">
                <CommandInput
                  onKeyDown={(e) => e.key === "Escape" && cancel()}
                  placeholder="Choose what to open here..."
                />
                <CommandList>
                  <CommandEmpty>No types found.</CommandEmpty>
                  <CommandGroup>
                    {PICKER_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <CommandItem
                          key={option.type}
                          onSelect={() => confirm(option.type)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {option.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={cancel} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      </BaseNode>
    </div>
  );
}
