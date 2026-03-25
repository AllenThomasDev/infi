// TODO: temporary test block — remove me
import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./constants";

window.addEventListener("message", (event) => {
  if (event.data === IPC_CHANNELS.START_ORPC_SERVER) {
    const [serverPort] = event.ports;

    ipcRenderer.postMessage(IPC_CHANNELS.START_ORPC_SERVER, null, [serverPort]);
  }
});

contextBridge.exposeInMainWorld("webviewBridge", {
  registerWebview: (webContentsId: number) =>
    ipcRenderer.send(IPC_CHANNELS.WEBVIEW_REGISTER, webContentsId),
  unregisterWebview: (webContentsId: number) =>
    ipcRenderer.send(IPC_CHANNELS.WEBVIEW_UNREGISTER, webContentsId),
  onEscape: (callback: (webContentsId: number) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      webContentsId: number
    ) => callback(webContentsId);
    ipcRenderer.on(IPC_CHANNELS.WEBVIEW_ESCAPE, listener);
    return () =>
      ipcRenderer.removeListener(IPC_CHANNELS.WEBVIEW_ESCAPE, listener);
  },
});

contextBridge.exposeInMainWorld("terminalBridge", {
  onData: (callback: (id: string, data: string) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      id: string,
      data: string
    ) => callback(id, data);
    ipcRenderer.on("terminal:data", listener);
    return () => ipcRenderer.removeListener("terminal:data", listener);
  },
  onExit: (
    callback: (id: string, exitCode: number, signal: number) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      id: string,
      exitCode: number,
      signal: number
    ) => callback(id, exitCode, signal);
    ipcRenderer.on("terminal:exit", listener);
    return () => ipcRenderer.removeListener("terminal:exit", listener);
  },
});
