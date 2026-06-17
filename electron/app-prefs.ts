import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AppPrefs, DisplayMode } from "@/types";

const PREFS_FILE = path.join(app.getPath("userData"), "app-prefs.json");

const DEFAULT_PREFS: AppPrefs = { displayMode: "windowed", autoLaunch: false };

const DISPLAY_MODES: readonly DisplayMode[] = ["windowed", "fullscreen", "borderless"];

function coerceMode(value: unknown): DisplayMode {
  return DISPLAY_MODES.includes(value as DisplayMode) ? (value as DisplayMode) : DEFAULT_PREFS.displayMode;
}

export function loadAppPrefs(): AppPrefs {
  try {
    const raw = JSON.parse(fs.readFileSync(PREFS_FILE, "utf-8")) as Partial<AppPrefs>;
    return {
      displayMode: coerceMode(raw.displayMode),
      autoLaunch: raw.autoLaunch === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveAppPrefs(prefs: AppPrefs): void {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs), "utf-8");
  } catch {
    /* non-fatal: a preference is a convenience, not data */
  }
}

/** Normalise a partial patch into a full, valid prefs object. */
export function mergeAppPrefs(current: AppPrefs, patch: Partial<AppPrefs>): AppPrefs {
  return {
    displayMode: patch.displayMode !== undefined ? coerceMode(patch.displayMode) : current.displayMode,
    autoLaunch: patch.autoLaunch !== undefined ? patch.autoLaunch === true : current.autoLaunch,
  };
}

/** Sync the OS "open at login" setting. No-op on platforms without support. */
export function applyAutoLaunch(enabled: boolean): void {
  if (process.platform !== "win32" && process.platform !== "darwin") return;
  app.setLoginItemSettings({ openAtLogin: enabled });
}
