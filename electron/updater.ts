import electronUpdater, { autoUpdater as namedAutoUpdater } from "electron-updater";
import { log } from "./logger";

/**
 * Auto-update via GitHub Releases (electron-updater). Best-effort and silent on
 * failure — an offline clinic must never be blocked by an update check. Only the
 * packaged build checks; dev/preview no-ops. Downloads in the background and
 * installs on quit (default behaviour of checkForUpdatesAndNotify).
 */

const autoUpdater = namedAutoUpdater ?? electronUpdater.autoUpdater;

export function initAutoUpdate(): void {
  autoUpdater.logger = {
    info: (m: unknown) => log("info", "updater", m),
    warn: (m: unknown) => log("warn", "updater", m),
    error: (m: unknown) => log("error", "updater", m),
    debug: () => undefined,
  };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => log("info", `update available ${info.version}`));
  autoUpdater.on("update-downloaded", (info) => log("info", `update downloaded ${info.version}`));
  autoUpdater.on("error", (err) => log("warn", "updater error", err));

  autoUpdater.checkForUpdatesAndNotify().catch((err) => log("warn", "update check failed", err));
}
