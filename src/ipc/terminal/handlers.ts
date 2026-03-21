import { os } from "@orpc/server";
import {
  killTerminal,
  resizeTerminal,
  spawnTerminal,
  writeTerminal,
} from "./pty-manager";
import {
  killTerminalInputSchema,
  resizeTerminalInputSchema,
  spawnTerminalInputSchema,
  writeTerminalInputSchema,
} from "./schemas";

export const spawn = os
  .input(spawnTerminalInputSchema)
  .handler(({ input }) => {
    const pid = spawnTerminal(input.id, input.cols, input.rows);
    return { pid };
  });

export const write = os
  .input(writeTerminalInputSchema)
  .handler(({ input }) => {
    writeTerminal(input.id, input.data);
  });

export const resize = os
  .input(resizeTerminalInputSchema)
  .handler(({ input }) => {
    resizeTerminal(input.id, input.cols, input.rows);
  });

export const kill = os
  .input(killTerminalInputSchema)
  .handler(({ input }) => {
    killTerminal(input.id);
  });
