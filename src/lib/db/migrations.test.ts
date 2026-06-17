import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmp: string;

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "homedoc-mig-"));
  process.env.HOMEDOC_DB_PATH = path.join(tmp, "clinic.db");
  process.env.HOMEDOC_SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");
});

after(async () => {
  const { closeDb } = await import("@/lib/db/client");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("fresh DB bootstraps schema at the current version", async () => {
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  assert.equal(Number(db.pragma("user_version", { simple: true })), 1);
});

test("expected core tables exist", async () => {
  const { getDb } = await import("@/lib/db/client");
  const db = getDb();
  const names = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );
  for (const t of [
    "users",
    "patients",
    "visits",
    "bills",
    "bill_items",
    "treatments",
    "expenses",
    "salary_payments",
    "soap_notes",
    "clinic_settings",
  ]) {
    assert.ok(names.has(t), `missing table ${t}`);
  }
});

test("integrity check passes on a fresh DB", async () => {
  const { integrityCheck } = await import("@/lib/db/client");
  assert.equal(integrityCheck(), null);
});

test("reopening keeps the same version (idempotent)", async () => {
  const { getDb, closeDb } = await import("@/lib/db/client");
  closeDb();
  const db = getDb();
  assert.equal(Number(db.pragma("user_version", { simple: true })), 1);
});
