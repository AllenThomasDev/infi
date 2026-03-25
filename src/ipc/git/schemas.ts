import { z } from "zod";

const cwdSchema = z.string().min(1);

export const listBranchesInputSchema = z.object({
  cwd: cwdSchema,
});

export const createWorktreeInputSchema = z.object({
  branch: z.string().min(1),
  cwd: cwdSchema,
  path: z.string().min(1),
});

export const removeWorktreeInputSchema = z.object({
  cwd: cwdSchema,
  path: z.string().min(1),
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
