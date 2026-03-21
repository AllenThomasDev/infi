import { z } from "zod";

export const spawnTerminalInputSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1),
  rows: z.number().int().min(1),
});

export const writeTerminalInputSchema = z.object({
  id: z.string().min(1),
  data: z.string(),
});

export const resizeTerminalInputSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1),
  rows: z.number().int().min(1),
});

export const killTerminalInputSchema = z.object({
  id: z.string().min(1),
});
