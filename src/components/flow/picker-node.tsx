import type { NodeProps } from "@xyflow/react";
import { AppWindow, Plus, Terminal } from "lucide-react";
import { useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import type { NodeType } from "@/components/flow/node-factories";
import type { PickerFlowNode } from "@/components/flow/types";
import { useTileActions } from "@/components/flow/use-tile-actions";
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
  const { remove, replace } = useTileActions();
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const cancelRef = useRef<(() => void) | null>(null);
  cancelRef.current = () => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    remove(id);
  };

  const confirmRef = useRef<((type: NodeType) => void) | null>(null);
  confirmRef.current = (type: NodeType) => {
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    replace(id, type);
  };

  useEffect(() => {
    const input = containerRef.current?.querySelector("input");
    const timer = setTimeout(() => input?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  // Kill on deselection (covers keyboard navigation away)
  useEffect(() => {
    if (!selected) {
      cancelRef.current?.();
    }
  }, [selected]);

  // Kill on DOM focus leaving the node
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const handleFocusOut = (e: FocusEvent) => {
      if (!(e.relatedTarget && el.contains(e.relatedTarget as Node))) {
        cancelRef.current?.();
      }
    };
    el.addEventListener("focusout", handleFocusOut);
    return () => el.removeEventListener("focusout", handleFocusOut);
  }, []);

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
                  onKeyDown={(e) => e.key === "Escape" && cancelRef.current?.()}
                  placeholder="Choose what to open here..."
                />
                <CommandList>
                  <CommandEmpty>No types found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => confirmRef.current?.("terminal")}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Terminal
                    </CommandItem>
                    <CommandItem
                      onSelect={() => confirmRef.current?.("window")}
                    >
                      <AppWindow className="mr-2 h-4 w-4" />
                      Window
                    </CommandItem>
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
