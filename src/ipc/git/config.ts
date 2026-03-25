/**
 * Minimal ServerConfig for infi — provides paths that the copied t3code
 * GitCore layer expects. Only the fields actually accessed are included.
 */
import { join } from "node:path";
import { app } from "electron";
import { ServiceMap } from "effect";

export interface ServerConfigShape {
  readonly cwd: string;
  readonly baseDir: string;
  readonly worktreesDir: string;
}

export class ServerConfig extends ServiceMap.Service<ServerConfig, ServerConfigShape>()(
  "t3/config/ServerConfig",
) {}

export function resolveServerConfig(): ServerConfigShape {
  const baseDir = app.getPath("userData");
  return {
    cwd: process.cwd(),
    baseDir,
    worktreesDir: join(baseDir, "worktrees"),
  };
}
