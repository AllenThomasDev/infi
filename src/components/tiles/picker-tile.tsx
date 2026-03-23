import type { LucideIcon } from "lucide-react";
import { Globe, Plus, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface PickerOption {
  icon: LucideIcon;
  label: string;
  type: "browser" | "terminal";
}

const PICKER_OPTIONS: PickerOption[] = [
  {
    type: "browser",
    icon: Globe,
    label: "Browser",
  },
  {
    type: "terminal",
    icon: Terminal,
    label: "Terminal",
  },
];

interface PickerTileContentProps {
  className?: string;
  isFocused: boolean;
  onCancel: () => void;
  onSelect: () => void;
  onSelectType: (type: PickerOption["type"]) => void;
  style?: React.CSSProperties;
}

export function PickerTileContent({
  className,
  isFocused,
  onCancel,
  onSelect,
  onSelectType,
  style,
}: PickerTileContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const cancel = useCallback(() => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    onCancel();
  }, [onCancel]);

  const confirm = useCallback(
    (type: PickerOption["type"]) => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      onSelectType(type);
    },
    [onSelectType]
  );

  useEffect(() => {
    if (!isFocused) {
      cancel();
      return;
    }

    doneRef.current = false;
    const frame = requestAnimationFrame(() => {
      const container = containerRef.current;
      const target = container?.querySelector<HTMLElement>("input");
      if (target && !container?.contains(document.activeElement)) {
        target.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [cancel, isFocused]);

  return (
    <div className={cn("h-full w-full", className)} onMouseDown={onSelect} ref={containerRef} style={style}>
      <BaseNode
        className="h-full w-full border-primary/35 border-dashed bg-primary/5 shadow-none backdrop-blur-sm"
        selected={isFocused}
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.24em]">
            <Plus className="h-3.5 w-3.5" />
            New Pane
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
