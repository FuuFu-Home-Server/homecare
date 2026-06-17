import Database from "better-sqlite3-multiple-ciphers";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "@/lib/config";
import { nowWIB } from "@/lib/format";
import { closeDb, currentDbPath, getDb } from "@/lib/db/client";

export interface BackupInfo {
  name: string;
  size: number;
  /** File mtime, ISO-8601. */
  createdAt: string;
}

/** Backups live alongside the live DB (project db/ in dev, userData in prod). */
function backupDir(): string {
  const dir = path.join(path.dirname(currentDbPath()), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Sortable WIB timestamp: YYYYMMDDHHMMSS. */
function stamp(): string {
  return nowWIB().slice(0, 19).replace(/[-:T]/g, "");
}

function statBackup(name: string): BackupInfo {
  const st = fs.statSync(path.join(backupDir(), name));
  return { name, size: st.size, createdAt: st.mtime.toISOString() };
}

export function listBackups(): BackupInfo[] {
  return fs
    .readdirSync(backupDir())
    .filter((f) => f.startsWith("clinic-") && f.endsWith(".db"))
    .map(statBackup)
    .sort((a, b) => b.name.localeCompare(a.name));
}

export function lastBackup(): BackupInfo | null {
  return listBackups()[0] ?? null;
}

function prune(): void {
  for (const old of listBackups().slice(CONFIG.backup.keepLast)) {
    fs.rmSync(path.join(backupDir(), old.name), { force: true });
  }
}

/** Consistent on-device snapshot via VACUUM INTO; prunes to keepLast. */
export function createBackup(): BackupInfo {
  const name = `clinic-${stamp()}.db`;
  const dest = path.join(backupDir(), name);
  getDb().exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  prune();
  return statBackup(name);
}

/** Create a backup only if the newest one is older than the configured cadence. */
export function autoBackupIfDue(): BackupInfo | null {
  const last = lastBackup();
  if (last) {
    const ageHours = (Date.now() - new Date(last.createdAt).getTime()) / 3_600_000;
    if (ageHours < CONFIG.backup.autoIntervalHours) return null;
  }
  return createBackup();
}

/**
 * Validate a backup file then replace the live DB with it. Takes a safety
 * snapshot of the current DB first. The connection is closed and reopened
 * lazily on the next query; a restart is still recommended for the UI to refresh.
 */
export function restoreBackup(name: string): void {
  const safe = path.basename(name);
  const src = path.join(backupDir(), safe);
  if (!fs.existsSync(src)) throw new Error("Berkas cadangan tidak ditemukan.");

  const probe = new Database(src, { readonly: true });
  const rows = probe.pragma("quick_check") as { quick_check: string }[];
  probe.close();
  if (rows[0]?.quick_check !== "ok") throw new Error("Berkas cadangan rusak.");

  createBackup();

  const live = currentDbPath();
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) {
    const f = `${live}${suffix}`;
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
  fs.copyFileSync(src, live);
}
