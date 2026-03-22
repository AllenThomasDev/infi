import { os } from "@orpc/server";
import { BrowserWindow, dialog } from "electron";

export const openDirectory = os.handler(async () => {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) {
    return { directory: null };
  }

  const result = await dialog.showOpenDialog(window, {
    properties: ["openDirectory", "createDirectory"],
    title: "Open Project Directory",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { directory: null };
  }

  return { directory: result.filePaths[0] };
});
