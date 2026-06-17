import Database from "better-sqlite3-multiple-ciphers";
import fs from "node:fs";
import path from "node:path";

/**
 * Single SQLite connection for the whole app (SQLCipher-capable driver, same
 * synchronous better-sqlite3 API). This is the ONLY place the raw Database
 * handle is constructed; every query lives in a sibling repository module.
 *
 * Encryption: when a master key is set (after login/setup), the connection is
 * opened with `PRAGMA key` so the on-disk file is encrypted. With no key the DB
 * opens as plaintext (dev / pre-encryption), so existing behaviour is preserved.
 */

/** Bump when a migration is appended to MIGRATIONS. Fresh DBs jump straight here. */
const SCHEMA_VERSION = 1;

/** Hex-encoded 32-byte DB master key, held in memory for the unlocked session. */
let masterKeyHex: string | null = null;

/** Set after the keystore is unlocked (login) or created (setup). Drops any
 * stale (possibly unkeyed) handle so the next getDb() reopens with the key. */
export function setMasterKey(key: Buffer): void {
  closeDb();
  masterKeyHex = key.toString("hex");
}

export function hasMasterKey(): boolean {
  return masterKeyHex !== null;
}

/** In-memory master key for re-wrapping keystore entries; null when locked. */
export function getMasterKey(): Buffer | null {
  return masterKeyHex ? Buffer.from(masterKeyHex, "hex") : null;
}

/** Drop the key and close the handle (logout / app lockout). */
export function clearMasterKey(): void {
  closeDb();
  masterKeyHex = null;
}

function applyKey(db: Database.Database): void {
  if (masterKeyHex) db.pragma(`key = "x'${masterKeyHex}'"`);
}

/**
 * DB location resolves lazily so the Electron main process can point at the OS
 * user-data dir (via HOMECARE_DB_PATH) before the first connection is opened.
 * In dev / web / the tsx scripts the env var is unset and we fall back to the
 * project `db/` folder.
 */
function resolveDbPath(): string {
  return process.env.HOMECARE_DB_PATH ?? path.join(process.cwd(), "db", "clinic.db");
}

/** Absolute path of the live DB file (honours HOMECARE_DB_PATH). */
export function currentDbPath(): string {
  return resolveDbPath();
}

/** Canonical schema for bootstrapping a fresh DB. Packaged: bundled resource. */
function resolveSchemaPath(): string {
  return process.env.HOMECARE_SCHEMA_PATH ?? path.join(process.cwd(), "db", "schema.sql");
}

export const DB_PATH = resolveDbPath();

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;
  const db = new Database(resolveDbPath());
  applyKey(db); // PRAGMA key must come before any other access on an encrypted DB
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  instance = db;
  return db;
}

/**
 * Encrypt an existing plaintext DB file in place (one-time, at setup). Opens the
 * file with no key and rekeys it to the master key. Caller must hold no open
 * handle (we close first).
 */
export function encryptDatabase(key: Buffer): void {
  closeDb();
  const db = new Database(resolveDbPath());
  db.pragma(`rekey = "x'${key.toString("hex")}'"`);
  db.close();
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
