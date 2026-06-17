import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { loadWindowState, persistWindowState } from "./window-state";
import { enableDesktopMode } from "@/lib/request-context";
import { CONFIG } from "@/lib/config";
import { autoBackup, registerIpc, shutdown } from "./ipc/dispatch";
import { registerPrintIpc } from "./ipc/print";
import { log } from "./logger";
import { initAutoUpdate } from "./updater";
import { APP_ORIGIN, registerAppScheme, registerStaticProtocol } from "./static-protocol";

// Last-resort crash trail: never let an unhandled error die silently on-device.
process.on("uncaughtException", (err) => log("error", "uncaughtException", err));
process.on("unhandledRejection", (reason) => log("error", "unhandledRejection", reason));

const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "out");

// Packaged builds — and an opt-in preview (HOMECARE_RENDERER=static) — serve the
// static export over app://; otherwise load the next-dev server for HMR.
const useStaticRenderer = app.isPackaged || process.env.HOMECARE_RENDERER === "static";

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
    title: "HomeCare",
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

  mainWindow.webContents.on("render-process-gone", (_e, details) =>
    log("error", "render-process-gone", details),
  );

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
      process.env.HOMECARE_DB_PATH = path.join(app.getPath("userData"), "clinic.db");
      // schema.sql ships as an extraResource (see electron-builder config).
      process.env.HOMECARE_SCHEMA_PATH = path.join(process.resourcesPath, "schema.sql");
    }
    log("info", `HomeCare start (packaged=${app.isPackaged}, renderer=${useStaticRenderer ? "static" : "dev"})`);
    enableDesktopMode();
    registerIpc();
    registerPrintIpc();
    if (useStaticRenderer) registerStaticProtocol(OUT_DIR);
    createWindow();

    // On-device backups (no server): run on launch, then on the configured cadence.
    void autoBackup();
    setInterval(() => void autoBackup(), CONFIG.backup.autoIntervalHours * 3_600_000);

    // Auto-update from GitHub Releases — packaged build only, best-effort.
    if (app.isPackaged) initAutoUpdate();
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
