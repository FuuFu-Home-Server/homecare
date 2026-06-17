import fs from "node:fs";
import path from "node:path";
import {
  getDb,
  closeDb,
  clearMasterKey,
  currentDbPath,
} from "@/lib/db/client";
import { createBackup } from "@/lib/db/backup";

/**
 * Destructive maintenance operations exposed in Settings → Zona Berbahaya.
 * Each data-level op takes a safety backup first; the caller (route) is
 * responsible for auth (perawat only) and confirmation.
 */

/** Delete all financial records (bills, payments, expenses), keep patients/stock. */
export function clearTransactions(): void {
  createBackup();
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM bill_items").run();
    db.prepare("DELETE FROM bills").run();
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM salary_payments").run();
    db.prepare("DELETE FROM cash_closings").run();
  })();
}

/** Delete every patient and all their clinical/billing trail; keep stock + accounts. */
export function deleteAllPatients(): void {
  createBackup();
  const db = getDb();
  db.transaction(() => {
    // Keep stock history intact: detach movements from the visits being removed.
    db.prepare("UPDATE stock_movements SET visit_id = NULL WHERE visit_id IS NOT NULL").run();
    db.prepare("DELETE FROM record_access_log").run();
    db.prepare("DELETE FROM soap_notes").run();
    db.prepare("DELETE FROM visit_interventions").run();
    db.prepare("DELETE FROM prescriptions").run();
    db.prepare("DELETE FROM bill_items").run();
    db.prepare("DELETE FROM bills").run();
    db.prepare("DELETE FROM visits").run();
    db.prepare("DELETE FROM patients").run();
  })();
}

/** Reset clinic profile + schedule back to defaults (config fallback). */
export function restoreDefaultSettings(): void {
  createBackup();
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM clinic_settings WHERE id = 1").run();
    db.prepare("DELETE FROM clinic_schedule_session").run();
  })();
}

/**
 * Nuke everything: drop the encrypted DB and keystore so the app returns to the
 * first-run setup wizard. Irreversible — no usable backup survives (the keystore
 * that decrypts it is removed too). Caller must trigger a renderer reload after.
 */
export function factoryReset(): void {
  closeDb();
  clearMasterKey();
  const db = currentDbPath();
  const dir = path.dirname(db);
  for (const f of [db, `${db}-wal`, `${db}-shm`]) fs.rmSync(f, { force: true });
  fs.rmSync(path.join(dir, "keystore.json"), { force: true });
  fs.rmSync(path.join(dir, "session.json"), { force: true });
}
