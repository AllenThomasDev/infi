import type { NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import { pickerNodeOptions } from "@/components/flow/node-registry";
import type { PickerFlowNode } from "@/components/flow/types";
import { useNodeActions } from "@/components/flow/use-node-actions";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function PickerNode({
  id,
  selected,
}: NodeProps<PickerFlowNode>) {
  const { removeSelf, replaceSelf } = useNodeActions(id);
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const cancel = useCallback(() => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    removeSelf();
  }, [removeSelf]);

  const confirm = useCallback(
    (type: (typeof pickerNodeOptions)[number]["type"]) => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      replaceSelf(type);
    },
    [replaceSelf]
  );

  // Defer focus until the CommandInput is mounted
  useEffect(() => {
    if (!selected) {
      return;
    }
    const timer = window.setTimeout(() => {
      const container = containerRef.current;
      const target = container?.querySelector<HTMLElement>("input");
      if (target && !container?.contains(document.activeElement)) {
        target.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  // Cancel when deselected or focus leaves the node
  useEffect(() => {
    if (!selected) {
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
  }, [cancel, selected]);

  return (
    <div className="nodrag nowheel h-full w-full" ref={containerRef}>
      <BaseNode
        className="h-full w-full border-primary/35 border-dashed bg-primary/5 shadow-none backdrop-blur-sm"
        selected={selected}
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
                    {pickerNodeOptions.map((option) => {
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
        </div>
      </BaseNode>
    </div>
  );
}
