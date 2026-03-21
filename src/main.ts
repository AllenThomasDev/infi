import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, session } from "electron";
import { ipcMain } from "electron/main";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { ipcContext } from "@/ipc/context";
import { IPC_CHANNELS } from "./constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload,
    },
  });
  ipcContext.setMainWindow(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

async function installExtensions() {
  const extensionPath = process.env.REACT_DEVTOOLS_PATH;

  if (!(inDevelopment && extensionPath)) {
    return;
  }

  try {
    const extension = await session.defaultSession.extensions.loadExtension(
      path.resolve(extensionPath)
    );

    console.log(`Extensions installed successfully: ${extension.name}`);
  } catch (error) {
    console.error("Failed to install extensions", error);
  }
}

function checkForUpdates() {
  if (inDevelopment) {
    return;
  }

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "LuanRoger/infi",
    },
  });
}

async function setupORPC() {
  const { rpcHandler } = await import("./ipc/handler");

  ipcMain.on(IPC_CHANNELS.START_ORPC_SERVER, (event) => {
    const [serverPort] = event.ports;

    serverPort.start();
    rpcHandler.upgrade(serverPort);
  });
}

app.whenReady().then(async () => {
  try {
    createWindow();
    await installExtensions();
    checkForUpdates();
    await setupORPC();
  } catch (error) {
    console.error("Error during app initialization:", error);
  }
});

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
