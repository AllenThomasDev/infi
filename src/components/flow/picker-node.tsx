import type { NodeProps } from "@xyflow/react";
import { Terminal, AppWindow } from "lucide-react";
import { useEffect, useRef } from "react";
import { BaseNode } from "@/components/base-node";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { PickerFlowNode } from "@/components/flow/types";
import { useTileActions } from "@/components/flow/use-tile-actions";
import type { NodeType } from "@/components/flow/node-factories";

export default function PickerNode({ id, selected }: NodeProps<PickerFlowNode>) {
  const { remove, replace } = useTileActions();
  const containerRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const cancelRef = useRef(() => {});
  cancelRef.current = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    remove(id);
  };

  const confirmRef = useRef((_type: NodeType) => {});
  confirmRef.current = (type: NodeType) => {
    if (doneRef.current) return;
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
    if (!selected) cancelRef.current();
  }, [selected]);

  // Kill on DOM focus leaving the node
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleFocusOut = (e: FocusEvent) => {
      if (!e.relatedTarget || !el.contains(e.relatedTarget as Node)) {
        cancelRef.current();
      }
    };
    el.addEventListener("focusout", handleFocusOut);
    return () => el.removeEventListener("focusout", handleFocusOut);
  }, []);

  return (
    <div ref={containerRef} className="nodrag nowheel" onKeyDown={(e) => e.key === "Escape" && cancelRef.current()}>
      <BaseNode className="w-64" selected={selected}>
        <Command className="rounded-none border-0 shadow-none">
          <CommandInput placeholder="Pick node type..." />
          <CommandList>
            <CommandEmpty>No types found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => confirmRef.current("terminal")}>
                <Terminal className="mr-2 h-4 w-4" />
                Terminal
              </CommandItem>
              <CommandItem onSelect={() => confirmRef.current("window")}>
                <AppWindow className="mr-2 h-4 w-4" />
                Window
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </BaseNode>
    </div>
  );
}
