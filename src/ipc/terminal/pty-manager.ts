import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BrowserWindow } from "electron";
import { type IPty, spawn } from "node-pty";

export interface PtySession {
  buffer: string;
  hasRunningSubprocess: boolean;
  id: string;
  pty: IPty;
}

const MAX_BUFFER_CHARS = 250_000;
const SUBPROCESS_POLL_INTERVAL_MS = 1000;

const sessions = new Map<string, PtySession>();
const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function hasRunningSubprocess(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  if (process.platform === "win32") {
    const command =
      `(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${pid}" ` +
      "-ErrorAction SilentlyContinue | Select-Object -First 1 | Measure-Object).Count";

    for (const executable of ["powershell.exe", "pwsh.exe"]) {
      const result = await execFileAsync(
        executable,
        ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
        {
          timeout: 1000,
          windowsHide: true,
        }
      ).catch(() => null);

      if (!result) {
        continue;
      }

      const count = Number.parseInt(result.stdout.trim(), 10);
      if (Number.isFinite(count)) {
        return count > 0;
      }
    }

    return false;
  }

  try {
    const result = await execFileAsync("pgrep", ["-P", String(pid)], {
      timeout: 1000,
    });
    return result.stdout.trim().length > 0;
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
      hasRunningSubprocess(session.pty.pid)
        .then((isRunning) => {
          if (session.hasRunningSubprocess === isRunning) {
            return;
          }
          session.hasRunningSubprocess = isRunning;
          mainWindow?.webContents.send(
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
    mainWindow?.webContents.send("terminal:data", id, data);
  });

  pty.onExit(({ exitCode, signal }) => {
    mainWindow?.webContents.send("terminal:activity", id, false);
    mainWindow?.webContents.send("terminal:exit", id, exitCode, signal);
    sessions.delete(id);
    updatePollingState();
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
  if (!session) {
    return;
  }
  mainWindow?.webContents.send("terminal:activity", id, false);
  session.pty.kill();
  sessions.delete(id);
  updatePollingState();
}

export function killAllTerminals() {
  for (const session of sessions.values()) {
    mainWindow?.webContents.send("terminal:activity", session.id, false);
    session.pty.kill();
  }
  sessions.clear();
  updatePollingState();
}
