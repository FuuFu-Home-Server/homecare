import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG } from "@/lib/config";
import type { CreatePatientInput } from "@/types";

/**
 * End-to-end offline data path for one full visit, exercised at the repository
 * layer (no server, no IPC): register → queue → vitals → SOAP + asuhan →
 * dispense (FEFO) → auto-bill → pay. Proves the core clinic workflow works
 * against a fresh on-disk DB.
 */

let tmp: string;
let perawatId: number;
let patientId: number;
let visitId: number;
let medicineId: number;
let billId: number;

const HARGA_JUAL = 5_000;
const DISPENSE_QTY = 5;

const PATIENT: CreatePatientInput = {
  nik: "3201010101900001",
  nama: "Budi Santoso",
  tglLahir: "1990-01-01",
  jenisKelamin: "L",
  alamat: "Jl. Mawar 1",
  telepon: "081200000000",
  jaminan: "umum",
  bpjsNo: null,
  alergi: null,
  agama: null,
  pekerjaan: null,
  pendidikan: null,
  statusNikah: null,
  riwayatKeluarga: null,
  merokok: null,
  alkohol: null,
  polaMakan: null,
};

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "homecare-flow-"));
  process.env.HOMECARE_DB_PATH = path.join(tmp, "clinic.db");
  process.env.HOMECARE_SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

  const { createUser } = await import("@/lib/db/users");
  perawatId = createUser({
    username: "owner",
    nama: "Ns. Dewi",
    role: "perawat",
    password: "secret1",
    telepon: null,
    info: null,
    alamat: null,
    tanggalMulai: null,
    pembayaran: null,
    gaji: null,
  }).id;
});

after(async () => {
  const { closeDb } = await import("@/lib/db/client");
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("register patient", async () => {
  const { createPatient } = await import("@/lib/db/patients");
  const p = createPatient(PATIENT);
  patientId = p.id;
  assert.ok(p.noRm, "patient gets a no_rm");
});

test("book visit + vitals + move through queue", async () => {
  const { createBooking, recordVitals, updateStatus, getQueueEntry } = await import("@/lib/db/queue");
  visitId = createBooking(patientId, "Demam 2 hari", perawatId).id;
  updateStatus(visitId, "tiba");
  recordVitals(visitId, {
    keluhanUtama: "Demam",
    tdSistol: 120,
    tdDiastol: 80,
    suhu: 38,
    berat: 60,
    tinggi: 170,
  });
  updateStatus(visitId, "diperiksa");
  assert.equal(getQueueEntry(visitId)?.status, "diperiksa");
});

test("record SOAP + asuhan keperawatan", async () => {
  const { createSoapNote, addIntervention } = await import("@/lib/db/records");
  createSoapNote(visitId, perawatId, {
    subjective: "Demam",
    objective: "Suhu 38",
    assessment: "Hipertermia",
    plan: "Kompres + edukasi",
    amendsId: null,
  });
  addIntervention(visitId, "intervensi", "Edukasi manajemen demam");

  const { getConsultBundle } = await import("@/lib/db/consult");
  const bundle = getConsultBundle(visitId);
  assert.ok(bundle, "consult bundle readable");
  assert.equal(bundle?.interventions.length, 1);
});

test("dispense draws stock via FEFO", async () => {
  const { createMedicine, addBatch, dispensePrescriptions } = await import("@/lib/db/inventory");
  medicineId = createMedicine({
    nama: "Paracetamol",
    merek: null,
    bentuk: "tablet",
    satuan: "tablet",
    hargaJual: HARGA_JUAL,
    obatKeras: false,
    isConsumable: false,
    supplier: null,
  }).id;
  // Two batches; FEFO must consume the sooner-expiring one first.
  addBatch(medicineId, { noBatch: "LATE", tglKadaluarsa: "2027-01-01", qty: 50, hargaBeli: null }, perawatId);
  addBatch(medicineId, { noBatch: "SOON", tglKadaluarsa: "2026-09-01", qty: 50, hargaBeli: null }, perawatId);

  const res = dispensePrescriptions(visitId, perawatId, [
    { medicineId, qty: DISPENSE_QTY, aturanPakai: "3x1" },
  ]);
  assert.ok(!res.warnings.some((w) => w.tipe === "shortfall"), "stock sufficient, no shortfall");

  const { getDb } = await import("@/lib/db/client");
  const soon = getDb()
    .prepare("SELECT qty FROM medicine_batches WHERE no_batch = 'SOON'")
    .get() as { qty: number };
  assert.equal(soon.qty, 50 - DISPENSE_QTY, "soonest-expiry batch drawn first");
});

test("auto-bill assembles konsultasi + obat lines", async () => {
  const { syncDraftBill, getBillItems } = await import("@/lib/db/billing");
  const bill = syncDraftBill(visitId);
  billId = bill.id;
  const items = getBillItems(bill.id);

  const obat = items.find((i) => i.tipe === "obat");
  assert.ok(items.some((i) => i.tipe === "konsultasi"), "konsultasi line present");
  assert.equal(obat?.subtotal, DISPENSE_QTY * HARGA_JUAL);
  assert.equal(bill.total, CONFIG.biayaKonsultasi + DISPENSE_QTY * HARGA_JUAL);
});

test("payment closes the bill and the visit", async () => {
  const { payBill } = await import("@/lib/db/billing");
  const { getQueueEntry } = await import("@/lib/db/queue");
  const total = CONFIG.biayaKonsultasi + DISPENSE_QTY * HARGA_JUAL;
  const paid = payBill(billId, "tunai", total + 5_000);
  assert.equal(paid.status, "lunas");
  assert.equal(paid.kembalian, 5_000);
  assert.equal(getQueueEntry(visitId)?.status, "selesai");
});
