/**
 * Stub TextGeneration layer — provides basic non-AI text generation.
 *
 * - Commit messages must be provided by the caller (fails if missing).
 * - PR content derives a title from the head branch and leaves the body empty.
 * - Branch name generation is not supported.
 *
 * Swap this for a real implementation (e.g. Claude-based) when ready.
 */
import { Effect, Layer } from "effect";
import { TextGenerationError } from "../Errors";
import { TextGeneration } from "../Services/TextGeneration";

const notImplemented = (operation: string) =>
  new TextGenerationError({
    operation,
    detail: "Text generation is not configured. Provide a commit message manually.",
  });

function branchToTitle(headBranch: string): string {
  const name = headBranch.replace(/^(?:feature|fix|chore|refactor|docs)\//i, "");
  return name.replaceAll(/[-_/]/g, " ").trim() || headBranch;
}

export const StubTextGenerationLive = Layer.succeed(TextGeneration, {
  generateCommitMessage: (_input) =>
    Effect.fail(notImplemented("generateCommitMessage")),
  generatePrContent: (input) =>
    Effect.succeed({
      title: branchToTitle(input.headBranch),
      body: "",
    }),
  generateBranchName: (_input) =>
    Effect.fail(notImplemented("generateBranchName")),
});
