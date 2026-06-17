import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmp: string;
let perawatId: number;
let asistenId: number;
const BULAN = "2026-06";

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "homedoc-pay-"));
  process.env.HOMEDOC_DB_PATH = path.join(tmp, "clinic.db");
  process.env.HOMEDOC_SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

  const { createUser } = await import("@/lib/db/users");
  perawatId = createUser({
    username: "owner",
    nama: "Owner",
    role: "perawat",
    password: "secret1",
    telepon: null,
    info: null,
    alamat: null,
    tanggalMulai: null,
    pembayaran: null,
    gaji: null,
  }).id;
  asistenId = createUser({
    username: "asisten1",
    nama: "Asisten Satu",
    role: "asisten",
    password: "secret1",
    telepon: null,
    info: null,
    alamat: null,
    tanggalMulai: null,
    pembayaran: null,
    gaji: 2_000_000,
  }).id;
});

after(async () => {
  const { closeDb } = await import("@/lib/db/client");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("staff start unpaid for the month", async () => {
  const { listPayroll } = await import("@/lib/db/payroll");
  const rows = listPayroll(BULAN);
  assert.equal(rows.length, 1, "perawat excluded from payroll");
  assert.equal(rows[0]?.userId, asistenId);
  assert.equal(rows[0]?.status, "belum");
});

test("marking paid snapshots amount and posts a Gaji expense", async () => {
  const { markSalaryPaid, listPayroll } = await import("@/lib/db/payroll");
  const { getDb } = await import("@/lib/db/client");
  markSalaryPaid(asistenId, BULAN, perawatId);

  const row = listPayroll(BULAN)[0];
  assert.equal(row?.status, "lunas");
  assert.equal(row?.jumlah, 2_000_000);

  const exp = getDb()
    .prepare("SELECT kategori, jumlah FROM expenses WHERE kategori = 'Gaji'")
    .get() as { kategori: string; jumlah: number } | undefined;
  assert.equal(exp?.jumlah, 2_000_000);
});

test("double payment for the same month is rejected", async () => {
  const { markSalaryPaid } = await import("@/lib/db/payroll");
  assert.throws(() => markSalaryPaid(asistenId, BULAN, perawatId), /sudah ditandai lunas/);
});

test("perawat cannot be put on payroll", async () => {
  const { markSalaryPaid } = await import("@/lib/db/payroll");
  assert.throws(() => markSalaryPaid(perawatId, BULAN, perawatId), /tidak termasuk penggajian/);
});

test("unmark removes the payment and its linked expense", async () => {
  const { unmarkSalaryPaid, listPayroll } = await import("@/lib/db/payroll");
  const { getDb } = await import("@/lib/db/client");
  unmarkSalaryPaid(asistenId, BULAN);

  assert.equal(listPayroll(BULAN)[0]?.status, "belum");
  const count = getDb()
    .prepare("SELECT COUNT(*) c FROM expenses WHERE kategori = 'Gaji'")
    .get() as { c: number };
  assert.equal(count.c, 0);
});
