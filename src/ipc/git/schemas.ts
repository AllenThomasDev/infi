import { z } from "zod";

const cwdSchema = z.string().min(1);

export const listBranchesInputSchema = z.object({
  cwd: cwdSchema,
});

export const createWorktreeInputSchema = z.object({
  branch: z.string().min(1),
  cwd: cwdSchema,
  newBranch: z.string().min(1).optional(),
  path: z.string().min(1).nullable(),
});

export const removeWorktreeInputSchema = z.object({
  cwd: cwdSchema,
  path: z.string().min(1),
  force: z.boolean().optional(),
});

export const gitStatusInputSchema = z.object({
  cwd: cwdSchema,
});

export const gitCommitInputSchema = z.object({
  cwd: cwdSchema,
  message: z.string().min(1),
  filePaths: z.array(z.string()).optional(),
});

export const gitPushInputSchema = z.object({
  cwd: cwdSchema,
});

export const gitPullInputSchema = z.object({
  cwd: cwdSchema,
});

export const gitInitInputSchema = z.object({
  cwd: cwdSchema,
});

export const gitCheckoutInputSchema = z.object({
  cwd: cwdSchema,
  branch: z.string().min(1),
});

export const gitRunStackedActionInputSchema = z.object({
  cwd: cwdSchema,
  action: z.enum(["commit", "commit_push", "commit_push_pr"]),
  commitMessage: z.string().optional(),
  featureBranch: z.boolean().optional(),
  filePaths: z.array(z.string().min(1)).min(1).optional(),
  model: z.string().optional(),
});
