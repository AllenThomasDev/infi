import { os } from "@orpc/server";
import { compileResolvedKeybindingsConfig } from "@/keybindings/compile";
import { DEFAULT_KEYBINDINGS } from "@/keybindings/defaults";

export const getKeybindings = os.handler(() => {
  return compileResolvedKeybindingsConfig(DEFAULT_KEYBINDINGS);
});
