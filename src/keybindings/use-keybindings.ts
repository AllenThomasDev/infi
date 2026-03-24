import { useEffect, useRef } from "react";
import { useKeybindingsConfig } from "./keybindings-context";
import { resolveShortcutCommand } from "./match";
import type {
  CommandHandlerMap,
  ShortcutMatchContext,
} from "./types";

interface UseKeybindingsOptions {
  context?:
    | Partial<ShortcutMatchContext>
    | (() => Partial<ShortcutMatchContext>);
  enabled?: boolean;
  handlers: CommandHandlerMap;
}

export function useKeybindings({
  handlers,
  context,
  enabled = true,
}: UseKeybindingsOptions) {
  const keybindings = useKeybindingsConfig();
  const handlersRef = useRef(handlers);
  const contextRef = useRef(context);
  handlersRef.current = handlers;
  contextRef.current = context;

  useEffect(() => {
    if (!enabled || keybindings.length === 0) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const ctx = contextRef.current;
      const resolved = typeof ctx === "function" ? ctx() : ctx;

      const command = resolveShortcutCommand(event, keybindings, {
        context: resolved,
      });
      if (!command) {
        return;
      }

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
