import { getDb } from "@/lib/db/client";
import { CONFIG } from "@/lib/config";
import { nowWIB, todayWIB } from "@/lib/format";
import { getPrescriptions } from "@/lib/db/inventory";
import { getQueueEntry, updateStatus } from "@/lib/db/queue";
import { getPatient } from "@/lib/db/patients";
import type {
  Bill,
  BillBundle,
  BillItem,
  BillStatus,
  KasirEntry,
  Jaminan,
  MetodeBayar,
  Treatment,
} from "@/types";

// ===== row mappers =====
interface BillRow {
  id: number;
  visit_id: number;
  jaminan: Jaminan;
  subtotal: number;
  diskon: number;
  total: number;
  status: BillStatus;
  metode: MetodeBayar | null;
  dibayar: number | null;
  kembalian: number | null;
  paid_at: string | null;
  created_at: string;
}

function toBill(r: BillRow): Bill {
  return {
    id: r.id,
    visitId: r.visit_id,
    jaminan: r.jaminan,
    subtotal: r.subtotal,
    diskon: r.diskon,
    total: r.total,
    status: r.status,
    metode: r.metode,
    dibayar: r.dibayar,
    kembalian: r.kembalian,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  };
}

interface ItemRow {
  id: number;
  bill_id: number;
  tipe: BillItem["tipe"];
  ref_id: number | null;
  deskripsi: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
}

function toItem(r: ItemRow): BillItem {
  return {
    id: r.id,
    billId: r.bill_id,
    tipe: r.tipe,
    refId: r.ref_id,
    deskripsi: r.deskripsi,
    qty: r.qty,
    hargaSatuan: r.harga_satuan,
    subtotal: r.subtotal,
  };
}

export function getBillByVisit(visitId: number): Bill | null {
  const row = getDb().prepare<[number], BillRow>("SELECT * FROM bills WHERE visit_id = ?").get(visitId);
  return row ? toBill(row) : null;
}

export function getBillById(id: number): Bill | null {
  const row = getDb().prepare<[number], BillRow>("SELECT * FROM bills WHERE id = ?").get(id);
  return row ? toBill(row) : null;
}

export function getBillItems(billId: number): BillItem[] {
  return getDb()
    .prepare<[number], ItemRow>("SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC")
    .all(billId)
    .map(toItem);
}

// ===== Treatments catalog =====
interface TreatmentRow {
  id: number;
  nama: string;
  harga: number;
  aktif: number;
}

export function listTreatments(): Treatment[] {
  return getDb()
    .prepare<[], TreatmentRow>("SELECT * FROM treatments WHERE aktif = 1 ORDER BY nama ASC")
    .all()
    .map((r) => ({ id: r.id, nama: r.nama, harga: r.harga, aktif: r.aktif === 1 }));
}

function recompute(db: ReturnType<typeof getDb>, billId: number): void {
  const sub = db
    .prepare<[number], { s: number | null }>("SELECT SUM(subtotal) s FROM bill_items WHERE bill_id = ?")
    .get(billId);
  const subtotal = sub?.s ?? 0;
  const billRow = db.prepare<[number], BillRow>("SELECT * FROM bills WHERE id = ?").get(billId);
  const diskon = billRow?.diskon ?? 0;
  db.prepare<[number, number, number]>("UPDATE bills SET subtotal = ?, total = ? WHERE id = ?").run(
    subtotal,
    Math.max(0, subtotal - diskon),
    billId,
  );
}

/**
 * Bill auto-assembly — the single source of truth used by the kasir screen.
 * Ensures a draft bill exists for the visit, then (re)builds the automatic lines:
 * one konsultasi fee + one line per dispensed obat. Manually-added tindakan lines
 * and any diskon are preserved. Only runs while the bill is still a draft.
 */
export function syncDraftBill(visitId: number): Bill {
  const db = getDb();

  const build = db.transaction((): Bill => {
    let bill = getBillByVisit(visitId);

    if (!bill) {
      const patient = getPatient(getQueueEntry(visitId)?.patientId ?? -1);
      const jaminan: Jaminan = patient?.jaminan ?? "umum";
      const res = db
        .prepare<[number, Jaminan, string]>(
          "INSERT INTO bills (visit_id, jaminan, status, created_at) VALUES (?,?,'draft',?)",
        )
        .run(visitId, jaminan, nowWIB());
      bill = getBillById(Number(res.lastInsertRowid));
      if (!bill) throw new Error("Gagal membuat tagihan.");
    }

    if (bill.status === "draft") {
      // Rebuild auto lines (konsultasi + obat); keep tindakan lines untouched.
      db.prepare<[number]>("DELETE FROM bill_items WHERE bill_id = ? AND tipe IN ('konsultasi','obat')").run(
        bill.id,
      );

      const insItem = db.prepare<[number, string, number | null, string, number, number, number]>(
        `INSERT INTO bill_items (bill_id, tipe, ref_id, deskripsi, qty, harga_satuan, subtotal)
         VALUES (?,?,?,?,?,?,?)`,
      );
      insItem.run(bill.id, "konsultasi", null, "Biaya konsultasi keperawatan", 1, CONFIG.biayaKonsultasi, CONFIG.biayaKonsultasi);

      for (const p of getPrescriptions(visitId)) {
        insItem.run(bill.id, "obat", p.id, `${p.nama}${p.aturanPakai ? ` (${p.aturanPakai})` : ""}`, p.qty, p.hargaJual, p.qty * p.hargaJual);
      }

      recompute(db, bill.id);
    }

    const updated = getBillByVisit(visitId);
    if (!updated) throw new Error("Tagihan tidak ditemukan.");
    return updated;
  });

  return build();
}

export function getBillBundle(visitId: number): BillBundle | null {
  const entry = getQueueEntry(visitId);
  if (!entry) return null;
  const patient = getPatient(entry.patientId);
  if (!patient) return null;
  const bill = syncDraftBill(visitId);
  return { bill, items: getBillItems(bill.id), entry, patient };
}

export function addTindakan(billId: number, treatmentId: number): void {
  const db = getDb();
  const t = db
    .prepare<[number], TreatmentRow>("SELECT * FROM treatments WHERE id = ?")
    .get(treatmentId);
  if (!t) throw new Error("Tindakan tidak ditemukan.");
  db.prepare<[number, number, string, number, number]>(
    `INSERT INTO bill_items (bill_id, tipe, ref_id, deskripsi, qty, harga_satuan, subtotal)
     VALUES (?, 'tindakan', ?, ?, 1, ?, ?)`,
  ).run(billId, treatmentId, t.nama, t.harga, t.harga);
  recompute(db, billId);
}

export function removeBillItem(itemId: number): void {
  const db = getDb();
  const row = db.prepare<[number], ItemRow>("SELECT * FROM bill_items WHERE id = ?").get(itemId);
  if (!row) return;
  // Only manually-added tindakan can be removed; auto lines rebuild on sync.
  if (row.tipe !== "tindakan") throw new Error("Hanya tindakan yang bisa dihapus.");
  db.prepare<[number]>("DELETE FROM bill_items WHERE id = ?").run(itemId);
  recompute(db, row.bill_id);
}

export function setDiskon(billId: number, diskon: number): void {
  const db = getDb();
  db.prepare<[number, number]>("UPDATE bills SET diskon = ? WHERE id = ?").run(Math.max(0, diskon), billId);
  recompute(db, billId);
}

/** Mark a bill paid and close the visit. Runs in one transaction. */
export function payBill(billId: number, metode: MetodeBayar, dibayar: number): Bill {
  const db = getDb();
  const pay = db.transaction((): Bill => {
    const bill = getBillById(billId);
    if (!bill) throw new Error("Tagihan tidak ditemukan.");
    if (bill.status === "lunas") return bill;
    const kembalian = Math.max(0, dibayar - bill.total);
    db.prepare<[MetodeBayar, number, number, string, number]>(
      "UPDATE bills SET status = 'lunas', metode = ?, dibayar = ?, kembalian = ?, paid_at = ? WHERE id = ?",
    ).run(metode, dibayar, kembalian, nowWIB(), billId);
    updateStatus(bill.visitId, "selesai");
    const paid = getBillById(billId);
    if (!paid) throw new Error("Gagal memproses pembayaran.");
    return paid;
  });
  return pay();
}

// ===== Kasir queue =====
export function getKasirQueue(tanggal: string = todayWIB()): KasirEntry[] {
  return getDb()
    .prepare<[string], KasirEntry>(
      `SELECT v.id AS visitId, v.nomor_antrian AS nomorAntrian, p.nama AS nama,
              p.jaminan AS jaminan, v.status AS status,
              b.status AS billStatus, b.total AS total
         FROM visits v
         JOIN patients p ON p.id = v.patient_id
         LEFT JOIN bills b ON b.visit_id = v.id
        WHERE v.tanggal = ?
          AND v.status IN ('diperiksa','tiba')
          AND (b.status IS NULL OR b.status IN ('draft','tertunda'))
        ORDER BY v.nomor_antrian ASC`,
    )
    .all(tanggal);
}
