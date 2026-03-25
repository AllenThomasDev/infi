import path from "node:path";
import type { BrowserWindow } from "electron";
import { type IPty, spawn } from "node-pty";
import {
  baseArgs,
  getTmuxBin,
  hasSession as hasTmuxSession,
  tmuxExec,
} from "./tmux";

export interface PtySession {
  buffer: string;
  hasRunningSubprocess: boolean;
  id: string;
  pty: IPty;
}

const MAX_BUFFER_CHARS = 250_000;
const SUBPROCESS_POLL_INTERVAL_MS = 1000;

const sessions = new Map<string, PtySession>();

let mainWindow: BrowserWindow | null = null;

function sendToRenderer(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}
let pollTimer: ReturnType<typeof setInterval> | null = null;
let shuttingDown = false;

async function checkSubprocess(session: PtySession): Promise<boolean> {
  try {
    const cmd = tmuxExec(
      "list-panes",
      "-t",
      session.id,
      "-F",
      "#{pane_current_command}"
    ).trim();
    const shellName = path.basename(process.env.SHELL ?? "zsh");
    return cmd !== shellName;
  } catch {
    return false;
  }
}

function updatePollingState() {
  if (sessions.size === 0) {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    return;
  }

  if (pollTimer) {
    return;
  }

  pollTimer = setInterval(() => {
    for (const session of sessions.values()) {
      checkSubprocess(session)
        .then((isRunning) => {
          if (session.hasRunningSubprocess === isRunning) {
            return;
          }
          session.hasRunningSubprocess = isRunning;
          sendToRenderer(
            "terminal:activity",
            session.id,
            isRunning
          );
        })
        .catch(() => undefined);
    }
  }, SUBPROCESS_POLL_INTERVAL_MS);
  pollTimer.unref?.();
}

export function setTerminalWindow(window: BrowserWindow) {
  mainWindow = window;
}

function spawnTmuxTerminal(
  id: string,
  cols: number,
  rows: number,
  cwd?: string
): IPty {
  const resolvedCwd = cwd ?? process.env.HOME ?? process.cwd();

  if (!hasTmuxSession(id)) {
    // Create a new session for this terminal.
    tmuxExec(
      "new-session",
      "-d",
      "-s",
      id,
      "-c",
      resolvedCwd,
      "-x",
      String(cols),
      "-y",
      String(rows)
    );
  }
  // Reconnect (or first attach) — just attach to the session.
  return spawn(getTmuxBin(), [...baseArgs(), "attach-session", "-t", id], {
    name: "xterm-256color",
    cols,
    rows,
    env: process.env as Record<string, string>,
  });
}

export function spawnTerminal(
  id: string,
  cols: number,
  rows: number,
  cwd?: string
): { backlog: string; hasRunningSubprocess: boolean; pid: number } {
  const existing = sessions.get(id);
  if (existing) {
    return {
      pid: existing.pty.pid,
      backlog: existing.buffer,
      hasRunningSubprocess: existing.hasRunningSubprocess,
    };
  }

  const pty = spawnTmuxTerminal(id, cols, rows, cwd);

  const session: PtySession = {
    pty,
    id,
    buffer: "",
    hasRunningSubprocess: false,
  };
  sessions.set(id, session);
  updatePollingState();

  pty.onData((data) => {
    session.buffer += data;
    if (session.buffer.length > MAX_BUFFER_CHARS) {
      session.buffer = session.buffer.slice(-MAX_BUFFER_CHARS);
    }
    sendToRenderer("terminal:data", id, data);
  });

  pty.onExit(({ exitCode, signal }) => {
    sessions.delete(id);
    updatePollingState();

    // During shutdown the PTY exits because we killed it to detach.
    // The tmux session is still alive — don't notify the renderer.
    if (shuttingDown) {
      return;
    }

    // If tmux session is still alive, this was an unexpected detach (not user exit).
    // Don't emit exit so the tile stays and can reconnect.
    if (hasTmuxSession(id)) {
      return;
    }

    sendToRenderer("terminal:activity", id, false);
    sendToRenderer("terminal:exit", id, exitCode, signal);
  });

  return {
    pid: pty.pid,
    backlog: "",
    hasRunningSubprocess: session.hasRunningSubprocess,
  };
}

export function writeTerminal(id: string, data: string) {
  sessions.get(id)?.pty.write(data);
}

export function resizeTerminal(id: string, cols: number, rows: number) {
  sessions.get(id)?.pty.resize(cols, rows);
}

export function killTerminal(id: string) {
  const session = sessions.get(id);
  if (session) {
    sendToRenderer("terminal:activity", id, false);
    session.pty.kill();
    sessions.delete(id);
  }

  try {
    tmuxExec("kill-session", "-t", id);
  } catch {
    // Already dead.
  }

  updatePollingState();
}

export function detachAllTerminals() {
  shuttingDown = true;
  for (const session of sessions.values()) {
    session.pty.kill();
  }
  sessions.clear();
  updatePollingState();
}

export function killAllTerminals() {
  shuttingDown = true;
  for (const session of sessions.values()) {
    session.pty.kill();
  }
  sessions.clear();
  updatePollingState();

  try {
    tmuxExec("kill-server");
  } catch {
    // Server may not be running.
  }
}
