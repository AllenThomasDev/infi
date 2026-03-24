import path from "node:path";
import type { BrowserWindow } from "electron";
import { type IPty, spawn } from "node-pty";
import {
  getTmuxBin,
  getTmuxConf,
  hasSession as hasTmuxSession,
  hasWindow as hasTmuxWindow,
  MASTER_SESSION,
  tmuxExec,
  viewSessionName,
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

function tmuxBaseArgs(): string[] {
  return ["-L", "infi", "-u", "-f", getTmuxConf()];
}

async function checkSubprocess(session: PtySession): Promise<boolean> {
  try {
    const cmd = tmuxExec(
      "list-panes",
      "-t",
      `${MASTER_SESSION}:${session.id}`,
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
  const viewName = viewSessionName(id);

  if (hasTmuxWindow(id)) {
    // Reconnect: window survives from previous app run.
    // Kill stale linked session if it exists from a previous attach.
    try {
      tmuxExec("kill-session", "-t", viewName);
    } catch {
      // No stale session — fine.
    }
  } else if (hasTmuxSession()) {
    // Master session exists, add a new window.
    tmuxExec(
      "new-window",
      "-t",
      MASTER_SESSION,
      "-n",
      id,
      "-c",
      resolvedCwd
    );
  } else {
    // First terminal — create master session with initial window.
    tmuxExec(
      "new-session",
      "-d",
      "-s",
      MASTER_SESSION,
      "-n",
      id,
      "-c",
      resolvedCwd,
      "-x",
      String(cols),
      "-y",
      String(rows)
    );
  }

  // Create a linked session so this PTY has its own independent window view.
  tmuxExec("new-session", "-d", "-t", MASTER_SESSION, "-s", viewName);
  tmuxExec("select-window", "-t", `${viewName}:${id}`);

  return spawn(getTmuxBin(), [...tmuxBaseArgs(), "attach-session", "-t", viewName], {
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
    // The tmux window is still alive — don't notify the renderer.
    if (shuttingDown) {
      return;
    }

    // If tmux window is still alive, this was an unexpected detach (not user exit).
    // Don't emit exit so the tile stays and can reconnect.
    if (hasTmuxWindow(id)) {
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
    tmuxExec("kill-session", "-t", viewSessionName(id));
  } catch {
    // Already dead.
  }
  try {
    tmuxExec("kill-window", "-t", `${MASTER_SESSION}:${id}`);
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
