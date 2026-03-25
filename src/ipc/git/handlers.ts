import type { ExecFileException } from "node:child_process";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { os } from "@orpc/server";
import path from "pathe";
import {
  createWorktreeInputSchema,
  gitCommitInputSchema,
  gitPushInputSchema,
  gitStatusInputSchema,
  listBranchesInputSchema,
  removeWorktreeInputSchema,
} from "./schemas";

const execFileAsync = promisify(execFile);
const BRANCH_PREFIX_PATTERN = /^[*+\s]+/;

export interface GitBranch {
  current: boolean;
  name: string;
  worktreePath: string | null;
}

interface GitResult {
  stderr: string;
  stdout: string;
}

function runGit(cwd: string, args: string[]) {
  return execFileAsync("git", ["-C", cwd, ...args]);
}

async function branchExists(cwd: string, branch: string) {
  try {
    await runGit(cwd, [
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${branch}`,
    ]);
    return true;
  } catch (error) {
    const execError = error as ExecFileException;
    if (execError.code === 1) {
      return false;
    }
    throw error;
  }
}

function parseBranches(output: string): GitBranch[] {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const current = line.startsWith("*");
      const name = line.replace(BRANCH_PREFIX_PATTERN, "");
      return {
        name,
        current,
        worktreePath: null,
      };
    });
}

function parseWorktrees(output: string) {
  const worktreeMap = new Map<string, string>();
  let currentPath: string | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("worktree ")) {
      currentPath = line.slice("worktree ".length);
      continue;
    }

    if (line.startsWith("branch refs/heads/") && currentPath) {
      worktreeMap.set(line.slice("branch refs/heads/".length), currentPath);
      continue;
    }

    if (line === "") {
      currentPath = null;
    }
  }

  return worktreeMap;
}

function isNotGitRepositoryError(result: GitResult | Error) {
  const message =
    result instanceof Error
      ? result.message
      : `${result.stderr}\n${result.stdout}`;
  return message.toLowerCase().includes("not a git repository");
}

export const listBranches = os
  .input(listBranchesInputSchema)
  .handler(async ({ input }) => {
    let stdout: string;
    let worktreeStdout = "";

    try {
      [{ stdout }, { stdout: worktreeStdout }] = await Promise.all([
        runGit(input.cwd, ["branch", "--no-color"]),
        runGit(input.cwd, ["worktree", "list", "--porcelain"]),
      ]);
    } catch (error) {
      if (
        isNotGitRepositoryError(
          error instanceof Error ? error : new Error(String(error))
        )
      ) {
        return {
          branches: [],
          currentBranch: null,
        };
      }
      throw error;
    }

    const worktreeMap = parseWorktrees(worktreeStdout);
    const branches = parseBranches(stdout).map((branch) => ({
      ...branch,
      worktreePath: worktreeMap.get(branch.name) ?? null,
    }));

    return {
      branches,
      currentBranch: branches.find((branch) => branch.current)?.name ?? null,
    };
  });

export const createWorktree = os
  .input(createWorktreeInputSchema)
  .handler(async ({ input }) => {
    await mkdir(path.dirname(input.path), { recursive: true });

    const args = (await branchExists(input.cwd, input.branch))
      ? ["worktree", "add", input.path, input.branch]
      : ["worktree", "add", "-b", input.branch, input.path, "HEAD"];

    await runGit(input.cwd, args);

    return { path: input.path };
  });

export const removeWorktree = os
  .input(removeWorktreeInputSchema)
  .handler(async ({ input }) => {
    await runGit(input.cwd, ["worktree", "remove", input.path]);
  });

export interface GitStatusFile {
  path: string;
  status: string;
}

export interface GitStatusResult {
  branch: string | null;
  hasChanges: boolean;
  files: GitStatusFile[];
  aheadCount: number;
  behindCount: number;
  hasUpstream: boolean;
}

export const gitStatus = os
  .input(gitStatusInputSchema)
  .handler(async ({ input }): Promise<GitStatusResult> => {
    let statusOutput: string;
    try {
      const result = await runGit(input.cwd, [
        "status",
        "--porcelain=v1",
        "-b",
        "--untracked-files=normal",
      ]);
      statusOutput = result.stdout;
    } catch (error) {
      if (
        isNotGitRepositoryError(
          error instanceof Error ? error : new Error(String(error))
        )
      ) {
        return {
          branch: null,
          hasChanges: false,
          files: [],
          aheadCount: 0,
          behindCount: 0,
          hasUpstream: false,
        };
      }
      throw error;
    }

    const lines = statusOutput.split("\n").filter(Boolean);
    const branchLine = lines[0] ?? "";
    const fileLines = lines.slice(1);

    let branch: string | null = null;
    let aheadCount = 0;
    let behindCount = 0;
    let hasUpstream = false;

    if (branchLine.startsWith("## ")) {
      const branchPart = branchLine.slice(3);
      const trackingMatch = branchPart.match(
        /^(.+?)\.\.\.(.+?)(?:\s+\[(.+)\])?$/
      );
      if (trackingMatch) {
        branch = trackingMatch[1] ?? null;
        hasUpstream = true;
        const tracking = trackingMatch[3];
        if (tracking) {
          const aheadMatch = tracking.match(/ahead (\d+)/);
          const behindMatch = tracking.match(/behind (\d+)/);
          aheadCount = aheadMatch ? Number.parseInt(aheadMatch[1]!, 10) : 0;
          behindCount = behindMatch
            ? Number.parseInt(behindMatch[1]!, 10)
            : 0;
        }
      } else {
        branch = branchPart.replace(/\s.*$/, "");
        if (branch === "No commits yet on main" || branch.startsWith("No ")) {
          branch = "main";
        }
      }
    }

    const files: GitStatusFile[] = fileLines.map((line) => ({
      status: line.slice(0, 2).trim(),
      path: line.slice(3),
    }));

    return {
      branch,
      hasChanges: files.length > 0,
      files,
      aheadCount,
      behindCount,
      hasUpstream,
    };
  });

export const gitCommit = os
  .input(gitCommitInputSchema)
  .handler(async ({ input }) => {
    if (input.filePaths && input.filePaths.length > 0) {
      await runGit(input.cwd, ["add", "--", ...input.filePaths]);
    } else {
      await runGit(input.cwd, ["add", "-A"]);
    }

    await runGit(input.cwd, ["commit", "-m", input.message]);
  });

export const gitPush = os
  .input(gitPushInputSchema)
  .handler(async ({ input }) => {
    try {
      await runGit(input.cwd, ["push"]);
    } catch {
      // If no upstream, set it and push
      const branchResult = await runGit(input.cwd, [
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ]);
      const branch = branchResult.stdout.trim();
      await runGit(input.cwd, ["push", "-u", "origin", branch]);
    }
  });
