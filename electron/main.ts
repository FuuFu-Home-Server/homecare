import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { loadWindowState, persistWindowState } from "./window-state";
import { enableDesktopMode } from "@/lib/request-context";
import { registerIpc, shutdown } from "./ipc/dispatch";

const isDev = !app.isPackaged;
const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    ...state.bounds,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#f8fafc",
    title: "HomeDoc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  const save = (): void => {
    if (mainWindow) persistWindowState(mainWindow);
  };
  mainWindow.on("resize", save);
  mainWindow.on("move", save);
  mainWindow.on("close", save);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void mainWindow.loadURL(RENDERER_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(() => {
    process.env.HOMEDOC_DB_PATH = path.join(app.getPath("userData"), "clinic.db");
    enableDesktopMode();
    registerIpc();
    createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  let quitting = false;
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    void shutdown().finally(() => app.quit());
  });
}
