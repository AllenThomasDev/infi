import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toastManager } from "@/components/ui/toast";
import { ipc } from "@/ipc/manager";
import { formatShortcutLabel } from "./match";
import type {
  KeybindingCommand,
  ResolvedKeybindingsConfig,
} from "./types";

const KeybindingsContext = createContext<ResolvedKeybindingsConfig>([]);

export function KeybindingsProvider({ children }: { children: ReactNode }) {
  const [keybindings, setKeybindings] = useState<ResolvedKeybindingsConfig>([]);

  useEffect(() => {
    ipc.client.keybindings
      .getKeybindings()
      .then((bindings) => setKeybindings(bindings as ResolvedKeybindingsConfig))
      .catch((err) => {
        toastManager.add({
          type: "warning",
          title: "Failed to load keybindings",
          description: err instanceof Error ? err.message : "Using default keybindings.",
        });
      });
  }, []);

  return (
    <KeybindingsContext value={keybindings}>
      {children}
    </KeybindingsContext>
  );
}

export function useKeybindingsConfig(): ResolvedKeybindingsConfig {
  return useContext(KeybindingsContext);
}

export function useShortcutLabel(command: KeybindingCommand): string | null {
  const keybindings = useContext(KeybindingsContext);

  return useMemo(() => {
    const rule = keybindings.find((r) => r.command === command);
    if (!rule) return null;
    return formatShortcutLabel(rule.shortcut);
  }, [keybindings, command]);
}
