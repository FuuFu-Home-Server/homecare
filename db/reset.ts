/**
 * One-command demo reset: drop the DB file, recreate from schema.sql, reseed.
 * `npm run db:reset`
 */
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("db:reset is a dev-only tool and is disabled in production builds.");
  process.exit(1);
}

const DB_DIR = path.join(process.cwd(), "db");
const DB_PATH = path.join(DB_DIR, "clinic.db");
const SCHEMA_PATH = path.join(DB_DIR, "schema.sql");

// Remove existing DB and WAL/SHM sidecars for a truly clean slate.
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const f = `${DB_PATH}${suffix}`;
  if (fs.existsSync(f)) fs.rmSync(f);
}

const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
const db = new Database(DB_PATH);
db.exec(schema);
db.close();
console.log("✓ Skema dibuat dari schema.sql");

// Run the seed script in a child process so it gets a fresh connection. Reuse
// the SAME runtime as this process (node or electron-as-node) so the native
// better-sqlite3 binding ABI always matches — avoids node/electron whack-a-mole.
const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
execFileSync(process.execPath, [tsxCli, path.join(DB_DIR, "seed.ts")], {
  stdio: "inherit",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});
