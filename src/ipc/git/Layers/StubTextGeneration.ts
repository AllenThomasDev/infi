/**
 * Stub TextGeneration layer — commit messages and PR content must be provided
 * by the caller. All generation methods fail with a descriptive error.
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

export const StubTextGenerationLive = Layer.succeed(TextGeneration, {
  generateCommitMessage: (_input) =>
    Effect.fail(notImplemented("generateCommitMessage")),
  generatePrContent: (_input) =>
    Effect.fail(notImplemented("generatePrContent")),
  generateBranchName: (_input) =>
    Effect.fail(notImplemented("generateBranchName")),
});
