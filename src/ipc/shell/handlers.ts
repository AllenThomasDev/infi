import { shell } from "electron";
import { os } from "@orpc/server";
import { openExternalInputSchema } from "./schemas";

export const openExternal = os
  .input(openExternalInputSchema)
  .handler(async ({ input }) => {
    await shell.openExternal(input.url);
  });
