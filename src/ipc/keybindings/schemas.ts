import { z } from "zod";
import { KEYBINDING_COMMANDS } from "@/keybindings/types";

export const keybindingCommandSchema = z.enum(KEYBINDING_COMMANDS);

export const keybindingRuleSchema = z.object({
  key: z.string().min(1).max(64),
  command: keybindingCommandSchema,
  when: z.string().min(1).max(256).optional(),
});

export const upsertKeybindingInputSchema = keybindingRuleSchema;
