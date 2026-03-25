import { destroyTerminalInstance } from "@/components/terminal/terminal-view";
import { ipc } from "@/ipc/manager";
import { useLayoutStore } from "@/stores/layout-store";
import { useTerminalTitleStore } from "@/stores/terminal-title-store";

export function closeTile(itemId: string, itemType: string) {
  if (itemType === "terminal") {
    ipc.client.terminal.kill({ id: itemId }).catch(console.error);
    destroyTerminalInstance(itemId);
    useTerminalTitleStore.getState().removeTitle(itemId);
  }

  useLayoutStore.getState().removeItem(itemId);
}
