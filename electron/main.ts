import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import path from "node:path";
import { loadWindowState, persistWindowState } from "./window-state";
import { applyAutoLaunch, loadAppPrefs, mergeAppPrefs, saveAppPrefs } from "./app-prefs";
import type { AppPrefs, DisplayMode } from "@/types";
import { enableDesktopMode, restorePersistedSession } from "@/lib/request-context";
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
const APP_ID = "id.homecare.app";
const ICON_PATH = app.isPackaged
  ? path.join(OUT_DIR, "app-icon.png")
  : path.join(__dirname, "..", "public", "app-icon.png");

// Packaged builds — and an opt-in preview (HOMECARE_RENDERER=static) — serve the
// static export over app://; otherwise load the next-dev server for HMR.
const useStaticRenderer = app.isPackaged || process.env.HOMECARE_RENDERER === "static";

registerAppScheme();

let mainWindow: BrowserWindow | null = null;
// Tracks the live presentation mode. Frame is fixed at construction, so a switch
// to/from "borderless" recreates the window; the others toggle fullscreen live.
let currentDisplayMode: DisplayMode = "windowed";
// Dev only: open DevTools once, not on every window rebuild.
let devtoolsOpened = false;

function createWindow(targetUrl?: string): void {
  const state = loadWindowState();
  const mode = currentDisplayMode;

  mainWindow = new BrowserWindow({
    ...state.bounds,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: mode !== "borderless",
    autoHideMenuBar: true,
    backgroundColor: "#f8fafc",
    title: "HomeCare",
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (state.maximized || mode === "borderless") mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    if (mode === "fullscreen") mainWindow?.setFullScreen(true);
    mainWindow?.show();
  });

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
    void mainWindow.loadURL(targetUrl ?? APP_ORIGIN);
  } else {
    void mainWindow.loadURL(targetUrl ?? RENDERER_DEV_URL);
    // Only on the first window — a display-mode switch recreates the window and
    // should not pop DevTools open again.
    if (!devtoolsOpened) {
      devtoolsOpened = true;
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  }
}

/** Rebuild the window — the only way to change the frame at runtime. The new
 * window is created before the old one is destroyed so the window count never
 * hits zero (which would fire `window-all-closed` → app.quit on Linux/Windows). */
function recreateWindow(): void {
  const old = mainWindow;
  if (old) persistWindowState(old);
  // Preserve the current route so a display-mode switch keeps the user in place.
  const url = old?.webContents.getURL() || undefined;
  createWindow(url);
  if (old) {
    old.removeAllListeners("closed");
    old.destroy();
  }
}

function applyDisplayMode(mode: DisplayMode): void {
  const frameChanges = (mode === "borderless") !== (currentDisplayMode === "borderless");
  currentDisplayMode = mode;
  if (!mainWindow) return;
  if (frameChanges) {
    // Defer: destroying the window inside the IPC handler kills the renderer
    // mid-invoke (crash). Let the reply unwind first, then rebuild.
    setImmediate(recreateWindow);
  } else {
    mainWindow.setFullScreen(mode === "fullscreen");
  }
}

function registerAppControlIpc(): void {
  ipcMain.handle("app:get-prefs", (): AppPrefs => loadAppPrefs());
  ipcMain.handle("app:set-prefs", (_event, patch: Partial<AppPrefs>): AppPrefs => {
    const next = mergeAppPrefs(loadAppPrefs(), patch);
    saveAppPrefs(next);
    if (patch.displayMode !== undefined) applyDisplayMode(next.displayMode);
    if (patch.autoLaunch !== undefined) applyAutoLaunch(next.autoLaunch);
    return next;
  });
  ipcMain.handle("app:quit", () => app.quit());
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
    // Desktop session survives a quit: persisted to userData so a re-open lands on
    // the lock screen instead of the login form. Only meaningful for the IPC
    // (packaged/static) renderer — the next-dev server uses its own cookie session.
    if (useStaticRenderer) {
      process.env.HOMECARE_SESSION_PATH = path.join(app.getPath("userData"), "session.json");
      restorePersistedSession();
    }
    log("info", `HomeCare start (packaged=${app.isPackaged}, renderer=${useStaticRenderer ? "static" : "dev"})`);
    // Windows: bind to the NSIS shortcut AUMID so toast notifications show
    // "HomeCare" instead of the default "app.electron" / electron.app.* id.
    if (process.platform === "win32") app.setAppUserModelId(APP_ID);
    Menu.setApplicationMenu(null);
    enableDesktopMode();
    registerIpc();
    registerPrintIpc();
    registerAppControlIpc();
    if (useStaticRenderer) registerStaticProtocol(OUT_DIR);

    // Desktop preferences: apply the saved presentation + login-item settings
    // before the window is built so first paint already matches the chosen mode.
    const prefs = loadAppPrefs();
    currentDisplayMode = prefs.displayMode;
    applyAutoLaunch(prefs.autoLaunch);
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
