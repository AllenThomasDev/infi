import type { BrowserWindow } from "electron";
import { type IPty, spawn } from "node-pty";

export interface PtySession {
  buffer: string;
  id: string;
  pty: IPty;
}

const MAX_BUFFER_CHARS = 250_000;

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
): { backlog: string; pid: number } {
  const existing = sessions.get(id);
  if (existing) {
    return { pid: existing.pty.pid, backlog: existing.buffer };
  }

  const shell =
    process.platform === "win32"
      ? (process.env.COMSPEC ?? "cmd.exe")
      : (process.env.SHELL ?? "/bin/zsh");

  const pty = spawn(shell, [], {
    name: "xterm-256color",
    cols,
    rows,
    cwd: cwd ?? process.env.HOME ?? process.cwd(),
    env: process.env as Record<string, string>,
  });

  const session: PtySession = { pty, id, buffer: "" };
  sessions.set(id, session);

  pty.onData((data) => {
    session.buffer += data;
    if (session.buffer.length > MAX_BUFFER_CHARS) {
      session.buffer = session.buffer.slice(-MAX_BUFFER_CHARS);
    }
    mainWindow?.webContents.send("terminal:data", id, data);
  });

  pty.onExit(({ exitCode, signal }) => {
    mainWindow?.webContents.send("terminal:exit", id, exitCode, signal);
    sessions.delete(id);
  });

  return { pid: pty.pid, backlog: "" };
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
