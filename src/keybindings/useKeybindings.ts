import { useCallback, useEffect, useRef, useState } from "react";
import { getKeybindings } from "@/actions/keybindings";
import { resolveShortcutCommand } from "./match";
import type {
  CommandHandlerMap,
  ResolvedKeybindingsConfig,
  ShortcutMatchContext,
} from "./types";

interface UseKeybindingsOptions {
  handlers: CommandHandlerMap;
  context?: Partial<ShortcutMatchContext>;
  enabled?: boolean;
}

export function useKeybindings({
  handlers,
  context,
  enabled = true,
}: UseKeybindingsOptions) {
  const [keybindings, setKeybindings] = useState<ResolvedKeybindingsConfig>(
    [],
  );
  const handlersRef = useRef(handlers);
  const contextRef = useRef(context);
  handlersRef.current = handlers;
  contextRef.current = context;

  useEffect(() => {
    getKeybindings().then(setKeybindings).catch(console.error);
  }, []);

  useEffect(() => {
    if (!enabled || keybindings.length === 0) return;

    function handleKeyDown(event: KeyboardEvent) {
      const command = resolveShortcutCommand(event, keybindings, {
        context: contextRef.current,
      });
      if (!command) return;

      const handler = handlersRef.current[command];
      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        handler();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, keybindings]);

  return { keybindings };
}
