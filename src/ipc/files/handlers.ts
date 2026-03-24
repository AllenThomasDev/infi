import { mkdir, readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";
import path from "pathe";
import { os } from "@orpc/server";
import { readFileInputSchema, writeFileInputSchema } from "./schemas";

export const readFile = os
  .input(readFileInputSchema)
  .handler(async ({ input }) => {
    try {
      const content = await fsReadFile(input.path, "utf-8");
      return { content };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { content: null };
      }
      throw error;
    }
  });

export const writeFile = os
  .input(writeFileInputSchema)
  .handler(async ({ input }) => {
    await mkdir(path.dirname(input.path), { recursive: true });
    await fsWriteFile(input.path, input.content, "utf-8");
  });
