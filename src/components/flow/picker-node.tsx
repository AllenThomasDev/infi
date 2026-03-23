import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import { pickerNodeOptions } from "@/components/flow/node-registry";
import type { PickerFlowNode } from "@/components/flow/types";
import { useNodeActions } from "@/components/flow/use-node-actions";
import { Button } from "@/components/ui/button";
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

const NIRI_PICKER_OPTIONS: PickerOption[] = pickerNodeOptions.flatMap(
  (option) =>
    option.type === "browser" || option.type === "terminal" ? [option] : []
);

interface PickerTileContentProps {
  isFocused: boolean;
  onCancel: () => void;
  onSelectType: (type: PickerOption["type"]) => void;
}

export function PickerTileContent({
  isFocused,
  onCancel,
  onSelectType,
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
      return;
    }
    doneRef.current = false;
    const timer = window.setTimeout(() => {
      const container = containerRef.current;
      const target = container?.querySelector<HTMLElement>("input");
      if (target && !container?.contains(document.activeElement)) {
        target.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused) {
      cancel();
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleFocusOut = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node)) {
        cancel();
      }
    };

    container.addEventListener("focusout", handleFocusOut);
    return () => container.removeEventListener("focusout", handleFocusOut);
  }, [cancel, isFocused]);

  return (
    <div className="h-full w-full" ref={containerRef}>
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
                    {NIRI_PICKER_OPTIONS.map((option) => {
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

export default function PickerNode({
  id,
  selected,
}: NodeProps<PickerFlowNode>) {
  const { removeSelf, replaceSelf } = useNodeActions(id);
  return (
    <PickerTileContent
      isFocused={selected}
      onCancel={removeSelf}
      onSelectType={replaceSelf}
    />
  );
}
