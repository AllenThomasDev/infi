import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { os } from "@orpc/server";
import path from "pathe";
import {
  createWorktreeInputSchema,
  listBranchesInputSchema,
  removeWorktreeInputSchema,
} from "./schemas";

const execFileAsync = promisify(execFile);
const BRANCH_PREFIX_PATTERN = /^[*\s]+/;

export interface GitBranch {
  current: boolean;
  name: string;
}

interface GitResult {
  stderr: string;
  stdout: string;
}

function runGit(cwd: string, args: string[]) {
  return execFileAsync("git", ["-C", cwd, ...args], {
    windowsHide: true,
  });
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
  } catch {
    return false;
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
      };
    });
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

    try {
      ({ stdout } = await runGit(input.cwd, ["branch", "--no-color"]));
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

    const branches = parseBranches(stdout);

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
