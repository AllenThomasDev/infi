import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ipc } from "@/ipc/manager";
import "@xterm/xterm/css/xterm.css";

const TERMINAL_ID = "default";

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
  visible: boolean;
}

export default function TerminalView({ visible }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 5000,
      fontFamily: '"Geist Mono", monospace',
      theme: getTerminalTheme(),
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Send user input to PTY
    const inputDisposable = terminal.onData((data) => {
      ipc.client.terminal
        .write({ id: TERMINAL_ID, data })
        .catch(console.error);
    });

    // Receive PTY output
    const removeDataListener = window.terminalBridge.onData((id, data) => {
      if (id === TERMINAL_ID) {
        terminal.write(data);
      }
    });

    const removeExitListener = window.terminalBridge.onExit(
      (id, exitCode, _signal) => {
        if (id === TERMINAL_ID) {
          terminal.writeln(`\r\n[Process exited with code ${exitCode}]`);
          spawnedRef.current = false;
        }
      },
    );

    // Theme sync
    const themeObserver = new MutationObserver(() => {
      terminal.options.theme = getTerminalTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      themeObserver.disconnect();
      inputDisposable.dispose();
      removeDataListener();
      removeExitListener();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Spawn PTY on first show
  useEffect(() => {
    if (!visible || spawnedRef.current || !terminalRef.current) return;

    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    spawnedRef.current = true;
    ipc.client.terminal
      .spawn({
        id: TERMINAL_ID,
        cols: terminal.cols,
        rows: terminal.rows,
      })
      .then(() => {
        terminal.focus();
      })
      .catch((err) => {
        terminal.writeln(`\r\n[Failed to spawn terminal: ${err}]`);
        spawnedRef.current = false;
      });

    // Fit after becoming visible
    if (fitAddon) {
      requestAnimationFrame(() => fitAddon.fit());
    }
  }, [visible]);

  // Refit on visibility change and resize
  useEffect(() => {
    if (!visible || !fitAddonRef.current) return;

    const fitAddon = fitAddonRef.current;
    const terminal = terminalRef.current;

    const handleResize = () => {
      requestAnimationFrame(() => {
        fitAddon.fit();
        if (terminal) {
          ipc.client.terminal
            .resize({
              id: TERMINAL_ID,
              cols: terminal.cols,
              rows: terminal.rows,
            })
            .catch(console.error);
        }
      });
    };

    // Fit immediately
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [visible]);

  // Focus terminal when visible
  useEffect(() => {
    if (visible && terminalRef.current) {
      requestAnimationFrame(() => terminalRef.current?.focus());
    }
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: visible ? "block" : "none" }}
    />
  );
}
