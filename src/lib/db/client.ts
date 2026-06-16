import Database from "better-sqlite3";
import path from "node:path";

/**
 * Single better-sqlite3 connection for the whole app.
 * better-sqlite3 is synchronous, so no pooling/async ceremony is needed.
 * This is the ONLY place the raw Database handle is constructed; every query
 * lives in a sibling repository module (patients.ts, inventory.ts, ...).
 */

export const DB_PATH = path.join(process.cwd(), "db", "clinic.db");

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  instance = db;
  return db;
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
