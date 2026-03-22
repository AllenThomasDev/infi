import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";
import { ipc } from "@/ipc/manager";
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

interface TerminalViewProps {
  terminalId: string;
}

export default function TerminalView({ terminalId }: TerminalViewProps) {
  const { directory } = useWorkspaceContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const spawnDirectoryRef = useRef(directory);
  // Incremented on each mount so a stale cleanup's deferred kill is cancelled
  // when strict mode remounts the component.
  const mountGenRef = useRef(0);

  // Initialize terminal, spawn PTY, wire up listeners
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const currentGen = ++mountGenRef.current;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 5000,
      fontFamily: '"JetBrainsMono Nerd Font Mono", "JetBrains Mono", monospace',
      theme: getTerminalTheme(),
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    try {
      terminal.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available; fall back to default canvas renderer
    }
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const inputDisposable = terminal.onData((data) => {
      ipc.client.terminal.write({ id: terminalId, data }).catch(console.error);
    });

    const removeDataListener = window.terminalBridge.onData((id, data) => {
      if (id === terminalId) {
        terminal.write(data);
      }
    });

    const removeExitListener = window.terminalBridge.onExit(
      (id, exitCode, _signal) => {
        if (id === terminalId) {
          terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
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

    ipc.client.terminal
      .spawn({
        id: terminalId,
        cols: terminal.cols,
        rows: terminal.rows,
        cwd: spawnDirectoryRef.current,
      })
      .then(() => {
        terminal.focus();
      })
      .catch((err) => {
        terminal.writeln(`\r\n[Failed to spawn terminal: ${err}]`);
      });

    return () => {
      themeObserver.disconnect();
      inputDisposable.dispose();
      removeDataListener();
      removeExitListener();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;

      // Defer PTY kill so a strict-mode remount can reclaim the session
      // before this fires. If mountGenRef has advanced, a new mount took
      // over and we skip the kill.
      const gen = currentGen;
      setTimeout(() => {
        if (mountGenRef.current === gen) {
          ipc.client.terminal.kill({ id: terminalId }).catch(console.error);
        }
      }, 50);
    };
  }, [terminalId]);

  // Refit on resize
  useEffect(() => {
    if (!fitAddonRef.current) {
      return;
    }

    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;

    const handleResize = () => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        if (terminal) {
          ipc.client.terminal
            .resize({
              id: terminalId,
              cols: terminal.cols,
              rows: terminal.rows,
            })
            .catch(console.error);
        }
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
