import { z } from "zod";

export const openExternalInputSchema = z.object({
  url: z.string().url(),
});
