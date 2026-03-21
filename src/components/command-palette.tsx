import { useMemo } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { formatShortcutLabel } from "@/keybindings/match";
import type {
  CommandHandlerMap,
  KeybindingCommand,
  ResolvedKeybindingsConfig,
} from "@/keybindings/types";

interface PaletteEntry {
  command: KeybindingCommand;
  group: string;
  label: string;
  shortcutLabel?: string;
}

function groupByCategory(entries: PaletteEntry[]) {
  const groups = new Map<string, PaletteEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.group) ?? [];
    list.push(entry);
    groups.set(entry.group, list);
  }
  return groups;
}

function commandGroup(command: string): string {
  const dot = command.indexOf(".");
  if (dot === -1) {
    return "General";
  }
  const prefix = command.slice(0, dot);
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function buildPaletteEntries(
  keybindings: ResolvedKeybindingsConfig
): PaletteEntry[] {
  const seen = new Set<string>();
  const entries: PaletteEntry[] = [];

  for (const rule of keybindings) {
    if (!rule.label) {
      continue;
    }
    if (seen.has(rule.command)) {
      continue;
    }
    seen.add(rule.command);
    entries.push({
      command: rule.command,
      label: rule.label,
      group: commandGroup(rule.command),
      shortcutLabel: formatShortcutLabel(rule.shortcut),
    });
  }

  return entries;
}

interface CommandPaletteProps {
  handlers: CommandHandlerMap;
  keybindings: ResolvedKeybindingsConfig;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  handlers,
  keybindings,
}: CommandPaletteProps) {
  const entries = useMemo(
    () => buildPaletteEntries(keybindings),
    [keybindings]
  );
  const groups = useMemo(() => groupByCategory(entries), [entries]);

  function handleSelect(command: KeybindingCommand) {
    onOpenChange(false);
    handlers[command]?.();
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <Command>
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>
          {[...groups.entries()].map(([group, items]) => (
            <CommandGroup heading={group} key={group}>
              {items.map((entry) => (
                <CommandItem
                  key={entry.command}
                  onSelect={() => handleSelect(entry.command)}
                  value={entry.label}
                >
                  {entry.label}
                  {entry.shortcutLabel && (
                    <CommandShortcut>{entry.shortcutLabel}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
