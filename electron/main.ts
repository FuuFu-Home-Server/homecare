import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { loadWindowState, persistWindowState } from "./window-state";
import { enableDesktopMode } from "@/lib/request-context";
import { registerIpc, shutdown } from "./ipc/dispatch";
import { APP_ORIGIN, registerAppScheme, registerStaticProtocol } from "./static-protocol";

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "out");

// Packaged builds — and an opt-in preview (HOMEDOC_RENDERER=static) — serve the
// static export over app://; otherwise load the next-dev server for HMR.
const useStaticRenderer = app.isPackaged || process.env.HOMEDOC_RENDERER === "static";

registerAppScheme();

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

  if (useStaticRenderer) {
    void mainWindow.loadURL(APP_ORIGIN);
  } else {
    void mainWindow.loadURL(RENDERER_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
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
    // Packaged: DB lives in the OS user-data dir (survives app updates). Dev:
    // fall back to the seeded project db/clinic.db so login works out of the box.
    // Fresh-DB schema bootstrap for production is handled in the migration step.
    if (app.isPackaged) {
      process.env.HOMEDOC_DB_PATH = path.join(app.getPath("userData"), "clinic.db");
      // schema.sql ships as an extraResource (see electron-builder config).
      process.env.HOMEDOC_SCHEMA_PATH = path.join(process.resourcesPath, "schema.sql");
    }
    enableDesktopMode();
    registerIpc();
    if (useStaticRenderer) registerStaticProtocol(OUT_DIR);
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
