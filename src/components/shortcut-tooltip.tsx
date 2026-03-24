import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShortcutLabel } from "@/keybindings/keybindings-context";
import type { KeybindingCommand } from "@/keybindings/types";

interface ShortcutTooltipProps {
  children: ReactNode;
  command: KeybindingCommand;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function ShortcutTooltip({
  children,
  command,
  label,
  side,
}: ShortcutTooltipProps) {
  const shortcut = useShortcutLabel(command);

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut && <kbd data-slot="kbd">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline keyboard shortcut hint for use inside buttons or labels.
 */
export function ShortcutKbd({ command }: { command: KeybindingCommand }) {
  const shortcut = useShortcutLabel(command);
  if (!shortcut) return null;

  return (
    <kbd className="ml-1.5 rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">
      {shortcut}
    </kbd>
  );
}
