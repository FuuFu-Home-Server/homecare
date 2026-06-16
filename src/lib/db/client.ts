import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Single better-sqlite3 connection for the whole app.
 * better-sqlite3 is synchronous, so no pooling/async ceremony is needed.
 * This is the ONLY place the raw Database handle is constructed; every query
 * lives in a sibling repository module (patients.ts, inventory.ts, ...).
 */

/** Bump when a migration is appended to MIGRATIONS. Fresh DBs jump straight here. */
const SCHEMA_VERSION = 1;

/**
 * DB location resolves lazily so the Electron main process can point at the OS
 * user-data dir (via HOMEDOC_DB_PATH) before the first connection is opened.
 * In dev / web / the tsx scripts the env var is unset and we fall back to the
 * project `db/` folder.
 */
function resolveDbPath(): string {
  return process.env.HOMEDOC_DB_PATH ?? path.join(process.cwd(), "db", "clinic.db");
}

/** Canonical schema for bootstrapping a fresh DB. Packaged: bundled resource. */
function resolveSchemaPath(): string {
  return process.env.HOMEDOC_SCHEMA_PATH ?? path.join(process.cwd(), "db", "schema.sql");
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

/** Run PRAGMA quick_check; returns null when healthy, else the first problem. */
export function integrityCheck(db: Database.Database = getDb()): string | null {
  const rows = db.pragma("quick_check") as { quick_check: string }[];
  const first = rows[0]?.quick_check;
  return first === "ok" || first === undefined ? null : first;
}

function tableExists(db: Database.Database, name: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) !== undefined
  );
}

function userVersion(db: Database.Database): number {
  return Number(db.pragma("user_version", { simple: true }));
}

/**
 * Versioned migration runner. Keeps the `schema.sql` + runner dual-write rule:
 *  - schema.sql is the canonical truth applied to a FRESH db (then user_version
 *    is set to SCHEMA_VERSION).
 *  - existing DBs upgrade incrementally via MIGRATIONS, tracked by user_version.
 *  - pre-versioning DBs (user_version 0 but tables present) get the legacy
 *    additive columns, then are pinned at the v1 baseline.
 *
 * Adding a schema change: edit schema.sql AND append a { version, up } entry,
 * then bump SCHEMA_VERSION.
 */
interface Migration {
  version: number;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: ReadonlyArray<Migration> = [
  // { version: 2, up: (db) => db.exec("ALTER TABLE ... ADD COLUMN ...") },
];

/** Additive columns/tables for DBs created before versioning (the v0 baseline). */
function applyLegacyBaseline(db: Database.Database): void {
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

function migrate(db: Database.Database): void {
  if (!tableExists(db, "clinic_settings")) {
    db.exec(fs.readFileSync(resolveSchemaPath(), "utf8"));
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
    return;
  }

  let version = userVersion(db);
  if (version === 0) {
    applyLegacyBaseline(db);
    db.pragma("user_version = 1");
    version = 1;
  }

  for (const m of MIGRATIONS) {
    if (m.version > version) {
      const run = db.transaction(() => {
        m.up(db);
        db.pragma(`user_version = ${m.version}`);
      });
      run();
      version = m.version;
    }
  }
}
