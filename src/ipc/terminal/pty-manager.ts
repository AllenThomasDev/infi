import type { BrowserWindow } from "electron";
import * as nodePty from "node-pty";

export interface PtySession {
  id: string;
  pty: nodePty.IPty;
}

const sessions = new Map<string, PtySession>();

let mainWindow: BrowserWindow | null = null;

export function setTerminalWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function spawnTerminal(
  id: string,
  cols: number,
  rows: number,
  cwd?: string
): number {
  const existing = sessions.get(id);
  if (existing) {
    return existing.pty.pid;
  }

  const shell =
    process.platform === "win32"
      ? (process.env.COMSPEC ?? "cmd.exe")
      : (process.env.SHELL ?? "/bin/zsh");

  const pty = nodePty.spawn(shell, [], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: cwd ?? process.env.HOME ?? process.cwd(),
    env: process.env as Record<string, string>,
  });

  sessions.set(id, { pty, id });

  pty.onData((data) => {
    mainWindow?.webContents.send("terminal:data", id, data);
  });

  pty.onExit(({ exitCode, signal }) => {
    mainWindow?.webContents.send("terminal:exit", id, exitCode, signal);
    sessions.delete(id);
  });

  return pty.pid;
}

export function writeTerminal(id: string, data: string) {
  sessions.get(id)?.pty.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number) {
  sessions.get(id)?.pty.resize(cols, rows);
}

export function killTerminal(id: string) {
  const session = sessions.get(id);
  if (!session) {
    return;
  }
  session.pty.kill();
  sessions.delete(id);
}

export function killAllTerminals() {
  for (const session of sessions.values()) {
    session.pty.kill();
  }
  sessions.clear();
}
