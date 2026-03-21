import { ipc } from "@/ipc/manager";
import type { ResolvedKeybindingsConfig } from "@/keybindings/types";

export async function getKeybindings(): Promise<ResolvedKeybindingsConfig> {
  return ipc.client.keybindings.getKeybindings() as Promise<ResolvedKeybindingsConfig>;
}
