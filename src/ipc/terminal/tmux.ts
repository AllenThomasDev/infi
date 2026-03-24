import { execFileSync } from "node:child_process";
import path from "node:path";
import { app } from "electron";

export const MASTER_SESSION = "infi";
const SOCKET_NAME = "infi";

export function getTmuxBin(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "tmux");
  }
  return "tmux";
}

export function getTmuxConf(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "tmux.conf");
  }
  const root = app.getAppPath();
  return path.join(root, "resources", "tmux.conf");
}

function baseArgs(): string[] {
  return ["-L", SOCKET_NAME, "-u", "-f", getTmuxConf()];
}

export function tmuxExec(...args: string[]): string {
  return execFileSync(getTmuxBin(), [...baseArgs(), ...args], {
    encoding: "utf8",
    timeout: 5000,
  }).trim();
}

let tmuxAvailable: boolean | null = null;

export function isTmuxAvailable(): boolean {
  if (tmuxAvailable !== null) {
    return tmuxAvailable;
  }

  try {
    tmuxExec("-V");
    tmuxAvailable = true;
  } catch {
    tmuxAvailable = false;
  }

  return tmuxAvailable;
}

export function hasSession(): boolean {
  try {
    tmuxExec("has-session", "-t", MASTER_SESSION);
    return true;
  } catch {
    return false;
  }
}

export function hasWindow(id: string): boolean {
  try {
    const raw = tmuxExec(
      "list-windows",
      "-t",
      MASTER_SESSION,
      "-F",
      "#{window_name}"
    );
    return raw.split("\n").includes(id);
  } catch {
    return false;
  }
}

export function viewSessionName(id: string): string {
  return `${MASTER_SESSION}-view-${id}`;
}
