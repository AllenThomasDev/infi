import { z } from "zod";

export const readFileInputSchema = z.object({
  path: z.string().min(1),
});

export const writeFileInputSchema = z.object({
  content: z.string(),
  path: z.string().min(1),
});
