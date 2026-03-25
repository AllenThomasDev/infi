import { execFileSync } from "node:child_process";
import path from "node:path";
import { app } from "electron";

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

export function baseArgs(): string[] {
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

/** Check whether a tmux session with the given terminal ID exists. */
export function hasSession(id: string): boolean {
  try {
    tmuxExec("has-session", "-t", id);
    return true;
  } catch {
    return false;
  }
}
