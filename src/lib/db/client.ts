import Database from "better-sqlite3";
import path from "node:path";

/**
 * Single better-sqlite3 connection for the whole app.
 * better-sqlite3 is synchronous, so no pooling/async ceremony is needed.
 * This is the ONLY place the raw Database handle is constructed; every query
 * lives in a sibling repository module (patients.ts, inventory.ts, ...).
 */

/**
 * DB location resolves lazily so the Electron main process can point at the OS
 * user-data dir (via HOMEDOC_DB_PATH) before the first connection is opened.
 * In dev / web / the tsx scripts the env var is unset and we fall back to the
 * project `db/` folder.
 */
function resolveDbPath(): string {
  return process.env.HOMEDOC_DB_PATH ?? path.join(process.cwd(), "db", "clinic.db");
}

export const DB_PATH = resolveDbPath();

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  const db = new Database(resolveDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  instance = db;
  return db;
}

/** Flush WAL and release the handle. Called from Electron main on quit. */
export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

/** Idempotent additive column migrations for DBs seeded before a column existed. */
function migrate(db: Database.Database): void {
  const add = (table: string, column: string, decl: string): void => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    }
  };
  add("clinic_settings", "app_title", "TEXT NOT NULL DEFAULT ''");
  add("clinic_settings", "struk_footer", "TEXT NOT NULL DEFAULT ''");
  add("clinic_settings", "struk_footer2", "TEXT NOT NULL DEFAULT ''");
  add("users", "telepon", "TEXT");
  add("users", "info", "TEXT");
  add("users", "pembayaran", "TEXT");
  add("users", "gaji", "INTEGER");
  add("users", "alamat", "TEXT");
  add("users", "tanggal_mulai", "TEXT");
  db.exec(
    `CREATE TABLE IF NOT EXISTS salary_payments (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id    INTEGER NOT NULL REFERENCES users (id),
       bulan      TEXT NOT NULL,
       jumlah     INTEGER NOT NULL,
       expense_id INTEGER REFERENCES expenses (id),
       paid_at    TEXT NOT NULL,
       paid_by    INTEGER NOT NULL REFERENCES users (id),
       UNIQUE (user_id, bulan)
     )`,
  );
}
