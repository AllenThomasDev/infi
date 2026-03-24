import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { ipc } from "@/ipc/manager";
import { useLayoutStore } from "@/stores/layout-store";
import "@xterm/xterm/css/xterm.css";
import "@/assets/fonts/jetbrains-mono-nerd.css";

function getTerminalTheme(): Record<string, string> {
  const isDark = document.documentElement.classList.contains("dark");
  if (isDark) {
    return {
      background: "#171717",
      foreground: "#fafafa",
      cursor: "#fafafa",
      selectionBackground: "#404040",
    };
  }
  return {
    background: "#ffffff",
    foreground: "#171717",
    cursor: "#171717",
    selectionBackground: "#d4d4d4",
  };
}

// ---------------------------------------------------------------------------
// Terminal instance cache
//
// xterm.js Terminal + WebGL context are expensive to create/destroy. When a
// tile moves between rows, React unmounts the old parent and mounts a new one.
// Without caching, every row-move destroys and recreates the terminal.
//
// The cache holds the DOM element + terminal instance. On React unmount we
// just detach the element; on remount we reattach it. A 1 s auto-destroy
// timer handles the case where a terminal is removed permanently (canvas
// close) — if nobody reattaches within 1 s, the entry is torn down.
// ---------------------------------------------------------------------------

interface CachedTerminal {
  callbacks: {
    onExit?: () => void;
    onRunningChange?: (isRunning: boolean) => void;
    onTitleChange?: (title: string) => void;
  };
  destroyTimer?: ReturnType<typeof setTimeout>;
  element: HTMLDivElement;
  fitAddon: FitAddon;
  teardown: () => void;
  terminal: Terminal;
}

const terminalCache = new Map<string, CachedTerminal>();

/**
 * Immediately destroy a cached terminal instance and all its listeners.
 * Call this when closing a terminal tile or when the PTY process exits.
 */
export function destroyTerminalInstance(id: string) {
  const cached = terminalCache.get(id);
  if (!cached) {
    return;
  }

  if (cached.destroyTimer) {
    clearTimeout(cached.destroyTimer);
  }

  terminalCache.delete(id);
  cached.teardown();
}

// ---------------------------------------------------------------------------

export interface TerminalViewHandle {
  blur: () => void;
  focus: () => void;
}

interface TerminalViewProps {
  onExit?: () => void;
  onRunningChange?: (isRunning: boolean) => void;
  onTitleChange?: (title: string) => void;
  terminalId: string;
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView(
    { onExit, onRunningChange, onTitleChange, terminalId },
    ref
  ) {
    const { directory } = useWorkspaceContext();
    const containerRef = useRef<HTMLDivElement>(null);
    // A terminal should spawn in the workspace directory that existed when this
    // view mounted; later context changes should not retarget an existing PTY.
    const spawnDirectoryRef = useRef(directory);

    // Keep cached callbacks current across re-renders so that listeners
    // installed once at creation time always call the latest props.
    const cached = terminalCache.get(terminalId);
    if (cached) {
      cached.callbacks.onExit = onExit;
      cached.callbacks.onRunningChange = onRunningChange;
      cached.callbacks.onTitleChange = onTitleChange;
    }

    useImperativeHandle(ref, () => ({
      blur: () => terminalCache.get(terminalId)?.terminal.blur(),
      focus: () => terminalCache.get(terminalId)?.terminal.focus(),
    }));

    // Attach (or create) the terminal instance.
    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const existing = terminalCache.get(terminalId);

      if (existing) {
        // Cancel pending auto-destroy — we're reattaching after a row move.
        if (existing.destroyTimer) {
          clearTimeout(existing.destroyTimer);
          existing.destroyTimer = undefined;
        }

        container.appendChild(existing.element);
        existing.fitAddon.fit();

        return () => {
          existing.element.remove();
          // Schedule auto-destroy. If the component remounts (row move), the
          // timer is cancelled above. If it doesn't (canvas close / tile
          // removal), the terminal is cleaned up after 1 s.
          existing.destroyTimer = setTimeout(() => {
            destroyTerminalInstance(terminalId);
          }, 1000);
        };
      }

      // --- First mount: create terminal and spawn PTY ---

      const element = document.createElement("div");
      element.className = "h-full w-full";
      container.appendChild(element);

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        lineHeight: 1.2,
        scrollback: 5000,
        fontFamily:
          '"JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace',
        theme: getTerminalTheme(),
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(element);
      try {
        terminal.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available; fall back to default canvas renderer
      }
      fitAddon.fit();

      const callbacks: CachedTerminal["callbacks"] = {
        onExit,
        onRunningChange,
        onTitleChange,
      };

      const inputDisposable = terminal.onData((data) => {
        // Strip terminal response sequences (DA1, DA2, DA3) that xterm.js
        // generates when queried. Without this filter, responses leak back
        // through the PTY into the tmux pane where the shell echoes them
        // as visible garbage like "1;2c0;276;0c".
        const filtered = data.replace(/\x1b\[[?>=][\d;]*c/g, "");
        if (!filtered) {
          return;
        }
        ipc.client.terminal
          .write({ id: terminalId, data: filtered })
          .catch(console.error);
      });

      const titleDisposable = terminal.onTitleChange((title) => {
        callbacks.onTitleChange?.(title);
      });

      const removeActivityListener = window.terminalBridge.onActivity(
        (id, isRunning) => {
          if (id === terminalId) {
            callbacks.onRunningChange?.(isRunning);
          }
        }
      );

      const removeDataListener = window.terminalBridge.onData((id, data) => {
        if (id === terminalId) {
          terminal.write(data);
        }
      });

      const removeExitListener = window.terminalBridge.onExit(
        (id, exitCode, _signal) => {
          if (id === terminalId) {
            callbacks.onRunningChange?.(false);
            terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
            callbacks.onExit?.();
          }
        }
      );

      const themeObserver = new MutationObserver(() => {
        terminal.options.theme = getTerminalTheme();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      const teardown = () => {
        themeObserver.disconnect();
        inputDisposable.dispose();
        titleDisposable.dispose();
        removeActivityListener();
        removeDataListener();
        removeExitListener();
        terminal.dispose();
        element.remove();
      };

      const entry: CachedTerminal = {
        callbacks,
        element,
        fitAddon,
        teardown,
        terminal,
      };

      terminalCache.set(terminalId, entry);

      ipc.client.terminal
        .spawn({
          id: terminalId,
          cols: terminal.cols,
          rows: terminal.rows,
          cwd: spawnDirectoryRef.current,
        })
        .then(({ backlog, hasRunningSubprocess }) => {
          // Guard: if the entry was destroyed before spawn resolved, bail.
          if (!terminalCache.has(terminalId)) {
            return;
          }

          callbacks.onRunningChange?.(hasRunningSubprocess);

          if (backlog) {
            terminal.write(backlog);
          }

          if (
            useLayoutStore.getState().layout.selectedItemId === terminalId
          ) {
            terminal.focus();
          }
        })
        .catch((err) => {
          if (terminalCache.has(terminalId)) {
            terminal.writeln(`\r\n[Failed to spawn terminal: ${err}]`);
          }
        });

      return () => {
        element.remove();
        entry.destroyTimer = setTimeout(() => {
          destroyTerminalInstance(terminalId);
        }, 1000);
      };
    }, [terminalId]); // eslint-disable-line react-hooks/exhaustive-deps -- callbacks tracked via mutable ref

    // Refit on resize
    useEffect(() => {
      const entry = terminalCache.get(terminalId);
      if (!entry) {
        return;
      }

      const handleResize = () => {
        requestAnimationFrame(() => {
          // Re-read entry in case it was destroyed between scheduling and execution.
          const current = terminalCache.get(terminalId);
          if (!current) {
            return;
          }

          current.fitAddon.fit();
          ipc.client.terminal
            .resize({
              id: terminalId,
              cols: current.terminal.cols,
              rows: current.terminal.rows,
            })
            .catch(console.error);
        });
      };

      handleResize();

      const resizeObserver = new ResizeObserver(handleResize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => resizeObserver.disconnect();
    }, [terminalId]);

    return <div className="h-full w-full" ref={containerRef} />;
  }
);

export default TerminalView;
