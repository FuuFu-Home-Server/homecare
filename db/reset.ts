/**
 * One-command demo reset: drop the DB file, recreate from schema.sql, reseed.
 * `npm run db:reset`
 */
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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

// Run the seed script in a child process so it gets a fresh connection.
execFileSync("npx", ["tsx", path.join(DB_DIR, "seed.ts")], { stdio: "inherit" });
