import { getDb } from "@/lib/db/client";
import { CONFIG } from "@/lib/config";
import { nowWIB, daysUntil } from "@/lib/format";
import { allocateFefo } from "@/lib/fefo";
import type {
  AddBatchInput,
  BentukObat,
  CreateMedicineInput,
  DispenseResult,
  DispenseWarning,
  Medicine,
  MedicineBatch,
  MedicineDetailBundle,
  MedicineStock,
  PrescriptionInput,
  PrescriptionView,
  StockMovementView,
} from "@/types";

interface MedicineRow {
  id: number;
  nama: string;
  merek: string | null;
  bentuk: BentukObat;
  satuan: string;
  harga_jual: number;
  obat_keras: number;
  is_consumable: number;
  supplier: string | null;
}

function toMedicine(r: MedicineRow): Medicine {
  return {
    id: r.id,
    nama: r.nama,
    merek: r.merek,
    bentuk: r.bentuk,
    satuan: r.satuan,
    hargaJual: r.harga_jual,
    obatKeras: r.obat_keras === 1,
    isConsumable: r.is_consumable === 1,
    supplier: r.supplier,
  };
}

interface BatchRow {
  id: number;
  medicine_id: number;
  no_batch: string;
  tgl_kadaluarsa: string;
  qty: number;
  harga_beli: number | null;
  created_at: string;
}

function toBatch(r: BatchRow): MedicineBatch {
  return {
    id: r.id,
    medicineId: r.medicine_id,
    noBatch: r.no_batch,
    tglKadaluarsa: r.tgl_kadaluarsa,
    qty: r.qty,
    hargaBeli: r.harga_beli,
    createdAt: r.created_at,
  };
}

/** Medicines with aggregate stock and nearest expiry — for pickers and the stock screen. */
export function listMedicinesWithStock(): MedicineStock[] {
  const db = getDb();
  const meds = db.prepare<[], MedicineRow>("SELECT * FROM medicines ORDER BY nama ASC").all();
  const agg = db
    .prepare<[], { medicine_id: number; total: number; nearest: string | null; cnt: number }>(
      `SELECT medicine_id, SUM(qty) AS total, MIN(tgl_kadaluarsa) AS nearest, COUNT(*) AS cnt
         FROM medicine_batches WHERE qty > 0 GROUP BY medicine_id`,
    )
    .all();
  const byId = new Map(agg.map((a) => [a.medicine_id, a]));
  return meds.map((m) => {
    const a = byId.get(m.id);
    return {
      ...toMedicine(m),
      totalQty: a?.total ?? 0,
      nearestExpiry: a?.nearest ?? null,
      batchCount: a?.cnt ?? 0,
    };
  });
}

export function getMedicineStock(medicineId: number): MedicineStock | null {
  return listMedicinesWithStock().find((m) => m.id === medicineId) ?? null;
}

/** All batches for a medicine including depleted ones (for the stock detail view). */
export function getAllBatches(medicineId: number): MedicineBatch[] {
  return getDb()
    .prepare<[number], BatchRow>(
      "SELECT * FROM medicine_batches WHERE medicine_id = ? ORDER BY tgl_kadaluarsa ASC, id ASC",
    )
    .all(medicineId)
    .map(toBatch);
}

export function getStockMovements(medicineId: number): StockMovementView[] {
  return getDb()
    .prepare<[number], { id: number; tipe: StockMovementView["tipe"]; qty: number; alasan: string | null; created_at: string; no_batch: string; tgl_kadaluarsa: string }>(
      `SELECT sm.id AS id, sm.tipe AS tipe, sm.qty AS qty, sm.alasan AS alasan,
              sm.created_at AS created_at, b.no_batch AS no_batch, b.tgl_kadaluarsa AS tgl_kadaluarsa
         FROM stock_movements sm
         JOIN medicine_batches b ON b.id = sm.batch_id
        WHERE b.medicine_id = ?
        ORDER BY sm.id DESC LIMIT 50`,
    )
    .all(medicineId)
    .map((r) => ({
      id: r.id,
      tipe: r.tipe,
      qty: r.qty,
      alasan: r.alasan,
      createdAt: r.created_at,
      noBatch: r.no_batch,
      tglKadaluarsa: r.tgl_kadaluarsa,
    }));
}

export function getMedicineDetail(medicineId: number): MedicineDetailBundle | null {
  const medicine = getMedicineStock(medicineId);
  if (!medicine) return null;
  return { medicine, batches: getAllBatches(medicineId), movements: getStockMovements(medicineId) };
}

export function createMedicine(input: CreateMedicineInput): Medicine {
  const db = getDb();
  const res = db
    .prepare<[string, string | null, string, string, number, number, number, string | null]>(
      `INSERT INTO medicines (nama, merek, bentuk, satuan, harga_jual, obat_keras, is_consumable, supplier)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.nama,
      input.merek,
      input.bentuk,
      input.satuan,
      input.hargaJual,
      input.obatKeras ? 1 : 0,
      input.isConsumable ? 1 : 0,
      input.supplier,
    );
  const row = db
    .prepare<[number], MedicineRow>("SELECT * FROM medicines WHERE id = ?")
    .get(Number(res.lastInsertRowid));
  if (!row) throw new Error("Gagal membuat obat.");
  return toMedicine(row);
}

/** Stock-in: add a new batch and record a 'masuk' movement, in one transaction. */
export function addBatch(medicineId: number, input: AddBatchInput, userId: number): MedicineBatch {
  const db = getDb();
  const run = db.transaction((): MedicineBatch => {
    const res = db
      .prepare<[number, string, string, number, number | null, string]>(
        `INSERT INTO medicine_batches (medicine_id, no_batch, tgl_kadaluarsa, qty, harga_beli, created_at)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(medicineId, input.noBatch, input.tglKadaluarsa, input.qty, input.hargaBeli, nowWIB());
    const batchId = Number(res.lastInsertRowid);
    db.prepare<[number, number, string, number, string]>(
      `INSERT INTO stock_movements (batch_id, tipe, qty, alasan, created_by, created_at)
       VALUES (?, 'masuk', ?, ?, ?, ?)`,
    ).run(batchId, input.qty, "Stok masuk", userId, nowWIB());
    const row = db.prepare<[number], BatchRow>("SELECT * FROM medicine_batches WHERE id = ?").get(batchId);
    if (!row) throw new Error("Gagal menambah batch.");
    return toBatch(row);
  });
  return run();
}

/** Manual stock adjustment for a batch (delta can be negative), with audit row. */
export function adjustBatch(batchId: number, delta: number, alasan: string, userId: number): void {
  const db = getDb();
  const run = db.transaction((): void => {
    const batch = db.prepare<[number], BatchRow>("SELECT * FROM medicine_batches WHERE id = ?").get(batchId);
    if (!batch) throw new Error("Batch tidak ditemukan.");
    const newQty = batch.qty + delta;
    if (newQty < 0) throw new Error("Stok tidak boleh negatif.");
    db.prepare<[number, number]>("UPDATE medicine_batches SET qty = ? WHERE id = ?").run(newQty, batchId);
    db.prepare<[number, number, string, number, string]>(
      `INSERT INTO stock_movements (batch_id, tipe, qty, alasan, created_by, created_at)
       VALUES (?, 'penyesuaian', ?, ?, ?, ?)`,
    ).run(batchId, delta, alasan, userId, nowWIB());
  });
  run();
}

export function getBatchesForMedicine(medicineId: number): MedicineBatch[] {
  return getDb()
    .prepare<[number], BatchRow>(
      "SELECT * FROM medicine_batches WHERE medicine_id = ? AND qty > 0 ORDER BY tgl_kadaluarsa ASC, id ASC",
    )
    .all(medicineId)
    .map(toBatch);
}

interface PrescRow {
  id: number;
  visit_id: number;
  medicine_id: number;
  qty: number;
  aturan_pakai: string | null;
  created_at: string;
  nama: string;
  satuan: string;
  harga_jual: number;
}

export function getPrescriptions(visitId: number): PrescriptionView[] {
  return getDb()
    .prepare<[number], PrescRow>(
      `SELECT p.*, m.nama AS nama, m.satuan AS satuan, m.harga_jual AS harga_jual
         FROM prescriptions p JOIN medicines m ON m.id = p.medicine_id
        WHERE p.visit_id = ? ORDER BY p.id ASC`,
    )
    .all(visitId)
    .map((r) => ({
      id: r.id,
      visitId: r.visit_id,
      medicineId: r.medicine_id,
      qty: r.qty,
      aturanPakai: r.aturan_pakai,
      createdAt: r.created_at,
      nama: r.nama,
      satuan: r.satuan,
      hargaJual: r.harga_jual,
    }));
}

/**
 * Dispense a prescription with FEFO (First-Expired-First-Out) stock deduction.
 *
 * The whole operation runs in ONE transaction so stock can never go inconsistent:
 * for each prescribed medicine we (1) record the prescription, (2) ask the pure
 * `allocateFefo` helper which batches to draw from — always the soonest-to-expire
 * first — then (3) decrement each chosen batch and (4) write a `stock_movements`
 * audit row (negative qty = stock out). If a drawn batch is within the near-expiry
 * window, or stock is insufficient, we surface a warning to the UI.
 */
export function dispensePrescriptions(
  visitId: number,
  userId: number,
  items: PrescriptionInput[],
): DispenseResult {
  const db = getDb();

  const run = db.transaction((): DispenseWarning[] => {
    const warnings: DispenseWarning[] = [];

    for (const item of items) {
      if (item.qty <= 0) continue;

      const med = db
        .prepare<[number], { nama: string }>("SELECT nama FROM medicines WHERE id = ?")
        .get(item.medicineId);
      const nama = med?.nama ?? `Obat #${item.medicineId}`;

      // (1) Record the prescription line.
      db.prepare<[number, number, number, string | null, string]>(
        "INSERT INTO prescriptions (visit_id, medicine_id, qty, aturan_pakai, created_at) VALUES (?,?,?,?,?)",
      ).run(visitId, item.medicineId, item.qty, item.aturanPakai, nowWIB());

      // (2) FEFO allocation over the medicine's in-stock batches.
      const batches = getBatchesForMedicine(item.medicineId);
      const { allocations, shortfall } = allocateFefo(batches, item.qty);

      if (shortfall > 0) {
        warnings.push({
          nama,
          tipe: "shortfall",
          detail: `Stok kurang ${shortfall}. Hanya ${item.qty - shortfall} yang bisa dikeluarkan.`,
        });
      }

      // (3) + (4) Decrement each batch and write the audit movement.
      for (const alloc of allocations) {
        db.prepare<[number, number]>(
          "UPDATE medicine_batches SET qty = qty - ? WHERE id = ?",
        ).run(alloc.taken, alloc.batchId);

        db.prepare<[number, number, number, string, number, string]>(
          `INSERT INTO stock_movements (batch_id, visit_id, tipe, qty, alasan, created_by, created_at)
           VALUES (?,?,'keluar',?,?,?,?)`,
        ).run(alloc.batchId, visitId, -alloc.taken, `Resep kunjungan #${visitId}`, userId, nowWIB());

        const sisaHari = daysUntil(alloc.tglKadaluarsa);
        if (sisaHari <= CONFIG.nearExpiryDays) {
          warnings.push({
            nama,
            tipe: "near-expiry",
            detail: `Batch ${alloc.noBatch} hampir kadaluarsa (${sisaHari} hari lagi).`,
          });
        }
      }
    }

    return warnings;
  });

  return { warnings: run() };
}
