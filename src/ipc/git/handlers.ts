/**
 * oRPC handlers for git operations.
 *
 * Each handler is a thin wrapper that runs the corresponding Effect service
 * method via Effect.runPromise. The actual git logic lives in the copied
 * t3code Effect layers (Layers/GitCore, Layers/GitManager, etc.).
 */
import { Effect, Layer } from "effect";
import { NodeServices } from "@effect/platform-node";
import { os } from "@orpc/server";
import {
  createWorktreeInputSchema,
  gitCheckoutInputSchema,
  gitCommitInputSchema,
  gitDiffInputSchema,
  gitDiffRangeInputSchema,
  gitInitInputSchema,
  gitPullInputSchema,
  gitPushInputSchema,
  gitRunStackedActionInputSchema,
  gitStatusInputSchema,
  listBranchesInputSchema,
  removeWorktreeInputSchema,
} from "./schemas";

import { GitCore } from "./Services/GitCore";
import { GitManager } from "./Services/GitManager";
import { GitService } from "./Services/GitService";

import { GitServiceLive } from "./Layers/GitService";
import { GitCoreLive } from "./Layers/GitCore";
import { GitManagerLive } from "./Layers/GitManager";
import { GitHubCliLive } from "./Layers/GitHubCli";
import { StubTextGenerationLive } from "./Layers/StubTextGeneration";
import { ServerConfig, resolveServerConfig } from "./config";

// Build the full service layer once. oRPC handlers call into it.
const ServerConfigLive = Layer.succeed(ServerConfig, resolveServerConfig());

const GitCoreFull = GitCoreLive.pipe(
  Layer.provide(GitServiceLive),
  Layer.provide(ServerConfigLive),
  Layer.provide(NodeServices.layer),
);

const GitManagerFull = GitManagerLive.pipe(
  Layer.provide(GitCoreFull),
  Layer.provide(GitHubCliLive),
  Layer.provide(StubTextGenerationLive),
  Layer.provide(NodeServices.layer),
);

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const listBranches = os
  .input(listBranchesInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.listBranches(input);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );

export const createWorktree = os
  .input(createWorktreeInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.createWorktree(input);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );

export const removeWorktree = os
  .input(removeWorktreeInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.removeWorktree(input);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );

export const gitStatus = os
  .input(gitStatusInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const mgr = yield* GitManager;
        return yield* mgr.status(input);
      }).pipe(Effect.provide(GitManagerFull)),
    ),
  );

export const gitPull = os
  .input(gitPullInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.pullCurrentBranch(input.cwd);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );

export const gitInit = os
  .input(gitInitInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.initRepo(input);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );

export const gitCheckout = os
  .input(gitCheckoutInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.checkoutBranch(input);
      }).pipe(Effect.scoped, Effect.provide(GitCoreFull)),
    ),
  );

export const gitRunStackedAction = os
  .input(gitRunStackedActionInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const mgr = yield* GitManager;
        return yield* mgr.runStackedAction(input);
      }).pipe(Effect.provide(GitManagerFull)),
    ),
  );

export const gitCommit = os
  .input(gitCommitInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const mgr = yield* GitManager;
        return yield* mgr.runStackedAction({
          cwd: input.cwd,
          action: "commit",
          commitMessage: input.message,
          ...(input.filePaths ? { filePaths: input.filePaths } : {}),
        });
      }).pipe(Effect.provide(GitManagerFull)),
    ),
  );

export const gitDiff = os
  .input(gitDiffInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const git = yield* GitService;
        const result = yield* git.execute({
          operation: "gitDiff.head",
          cwd: input.cwd,
          args: ["diff", "--patch", "--minimal", "--no-color", "HEAD"],
        });
        return { diff: result.stdout };
      }).pipe(Effect.provide(GitServiceLive), Effect.provide(NodeServices.layer)),
    ),
  );

const DEFAULT_BASE_CANDIDATES = ["main", "master"] as const;

export const gitDiffRange = os
  .input(gitDiffRangeInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        const git = yield* GitService;

        // Detect if cwd is a linked worktree (not the main working tree).
        // For the main worktree, git-dir is ".git"; for linked ones it's
        // inside ".git/worktrees/<name>".
        const gitDirResult = yield* git.execute({
          operation: "gitDiffRange.gitDir",
          cwd: input.cwd,
          args: ["rev-parse", "--git-dir"],
        });
        const gitDir = gitDirResult.stdout.trim();
        const isLinkedWorktree = gitDir.includes(".git/worktrees/");

        if (!isLinkedWorktree) {
          return { isLinkedWorktree: false, commitSummary: "", diffSummary: "", diffPatch: "" };
        }

        // Resolve the current branch name
        const headResult = yield* git.execute({
          operation: "gitDiffRange.head",
          cwd: input.cwd,
          args: ["rev-parse", "--abbrev-ref", "HEAD"],
        });
        const currentBranch = headResult.stdout.trim();

        // Resolve default branch: origin/HEAD → fallback to main/master
        const refResult = yield* git.execute({
          operation: "gitDiffRange.defaultRef",
          cwd: input.cwd,
          args: ["symbolic-ref", "refs/remotes/origin/HEAD"],
          allowNonZeroExit: true,
        });

        let baseBranch: string | null = null;
        if (refResult.code === 0) {
          const ref = refResult.stdout.trim().replace(/^refs\/remotes\/origin\//, "");
          if (ref.length > 0 && ref !== currentBranch) {
            baseBranch = ref;
          }
        }

        if (!baseBranch) {
          for (const candidate of DEFAULT_BASE_CANDIDATES) {
            if (candidate === currentBranch) continue;
            const check = yield* git.execute({
              operation: "gitDiffRange.branchExists",
              cwd: input.cwd,
              args: ["rev-parse", "--verify", candidate],
              allowNonZeroExit: true,
            });
            if (check.code === 0) {
              baseBranch = candidate;
              break;
            }
          }
        }

        if (!baseBranch) {
          return { isLinkedWorktree: true, commitSummary: "", diffSummary: "", diffPatch: "" };
        }

        const range = yield* core.readRangeContext(input.cwd, baseBranch);
        return { isLinkedWorktree: true, ...range };
      }).pipe(
        Effect.provide(GitCoreFull),
        Effect.provide(GitServiceLive),
        Effect.provide(NodeServices.layer),
      ),
    ),
  );

export const gitPush = os
  .input(gitPushInputSchema)
  .handler(({ input }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const core = yield* GitCore;
        return yield* core.pushCurrentBranch(input.cwd, null);
      }).pipe(Effect.provide(GitCoreFull)),
    ),
  );
