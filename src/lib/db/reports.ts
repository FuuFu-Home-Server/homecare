import { getDb } from "@/lib/db/client";
import { CONFIG } from "@/lib/config";
import { daysUntil, todayWIB } from "@/lib/format";
import type {
  ClinicalReport,
  ExpenseRow,
  FinancialReport,
  InventoryReport,
  NearExpiryItem,
  NameCount,
  TransactionRow,
  TrendPoint,
} from "@/types";

/** All report queries are scoped to a "YYYY-MM" month string (WIB-local). */

function num(sql: string, ...p: (string | number)[]): number {
  const row = getDb().prepare<typeof p, { v: number | null }>(sql).get(...p);
  return row?.v ?? 0;
}

export function getFinancialReport(month: string): FinancialReport {
  const db = getDb();
  const lunasWhere = "status = 'lunas' AND substr(paid_at,1,7) = ?";

  const pendapatan = num(`SELECT SUM(total) v FROM bills WHERE ${lunasWhere}`, month);
  const pengeluaran = num("SELECT SUM(jumlah) v FROM expenses WHERE substr(tanggal,1,7) = ?", month);
  const jumlahTransaksi = num(`SELECT COUNT(*) v FROM bills WHERE ${lunasWhere}`, month);

  const metode = (m: string): number =>
    num(`SELECT SUM(total) v FROM bills WHERE ${lunasWhere} AND metode = ?`, month, m);
  const jaminan = (j: string): number =>
    num(`SELECT SUM(total) v FROM bills WHERE ${lunasWhere} AND jaminan = ?`, month, j);

  const dailyRevenue: TrendPoint[] = db
    .prepare<[string], { tanggal: string; value: number }>(
      `SELECT substr(paid_at,1,10) AS tanggal, SUM(total) AS value
         FROM bills WHERE ${lunasWhere} GROUP BY tanggal ORDER BY tanggal ASC`,
    )
    .all(month);

  return {
    pendapatan,
    pengeluaran,
    laba: pendapatan - pengeluaran,
    byMetode: { tunai: metode("tunai"), transfer: metode("transfer"), qris: metode("qris") },
    byJaminan: { umum: jaminan("umum"), bpjs: jaminan("bpjs") },
    dailyRevenue,
    jumlahTransaksi,
  };
}

export function getTransactions(month: string): TransactionRow[] {
  return getDb()
    .prepare<[string], TransactionRow>(
      `SELECT b.id AS id, b.paid_at AS paidAt, p.nama AS pasien,
              b.metode AS metode, b.jaminan AS jaminan, b.total AS total
         FROM bills b
         JOIN visits v ON v.id = b.visit_id
         JOIN patients p ON p.id = v.patient_id
        WHERE b.status = 'lunas' AND substr(b.paid_at,1,7) = ?
        ORDER BY b.paid_at DESC`,
    )
    .all(month);
}

export function getExpenses(month: string): ExpenseRow[] {
  return getDb()
    .prepare<[string], ExpenseRow>(
      `SELECT id, tanggal, kategori, deskripsi, jumlah
         FROM expenses
        WHERE substr(tanggal,1,7) = ?
        ORDER BY tanggal DESC, id DESC`,
    )
    .all(month);
}

export function getClinicalReport(month: string): ClinicalReport {
  const db = getDb();
  const totalKunjungan = num(
    "SELECT COUNT(*) v FROM visits WHERE status != 'batal' AND substr(tanggal,1,7) = ?",
    month,
  );

  const topTreatments: NameCount[] = db
    .prepare<[string], { label: string; count: number }>(
      `SELECT bi.deskripsi AS label, COUNT(*) AS count
         FROM bill_items bi JOIN bills b ON b.id = bi.bill_id JOIN visits v ON v.id = b.visit_id
        WHERE bi.tipe = 'tindakan' AND substr(v.tanggal,1,7) = ?
        GROUP BY bi.deskripsi ORDER BY count DESC LIMIT 10`,
    )
    .all(month);

  const visitTrend: TrendPoint[] = db
    .prepare<[string], { tanggal: string; value: number }>(
      `SELECT tanggal, COUNT(*) AS value FROM visits
        WHERE status != 'batal' AND substr(tanggal,1,7) = ?
        GROUP BY tanggal ORDER BY tanggal ASC`,
    )
    .all(month);

  return { totalKunjungan, topTreatments, visitTrend };
}

export function getInventoryReport(): InventoryReport {
  const db = getDb();
  const nilaiStok = num(
    `SELECT SUM(b.qty * m.harga_jual) v FROM medicine_batches b
       JOIN medicines m ON m.id = b.medicine_id WHERE b.qty > 0`,
  );

  // Low-stock: medicines whose total in-stock qty is at/below threshold.
  const lowStockCount = num(
    `SELECT COUNT(*) v FROM (
        SELECT m.id, COALESCE(SUM(b.qty),0) total FROM medicines m
          LEFT JOIN medicine_batches b ON b.medicine_id = m.id
        WHERE m.is_consumable = 0 GROUP BY m.id HAVING total <= ?)`,
    CONFIG.lowStockThreshold,
  );

  const nearRows = db
    .prepare<[string], Omit<NearExpiryItem, "sisaHari">>(
      `SELECT b.id AS batchId, m.id AS medicineId, m.nama AS nama,
              b.no_batch AS noBatch, b.tgl_kadaluarsa AS tglKadaluarsa, b.qty AS qty
         FROM medicine_batches b JOIN medicines m ON m.id = b.medicine_id
        WHERE b.qty > 0 AND b.tgl_kadaluarsa <= ?
        ORDER BY b.tgl_kadaluarsa ASC`,
    )
    .all(addDays(todayWIB(), CONFIG.nearExpiryDays));
  const nearExpiry: NearExpiryItem[] = nearRows.map((r) => ({ ...r, sisaHari: daysUntil(r.tglKadaluarsa) }));

  const fastMoving: NameCount[] = db
    .prepare<[], { label: string; count: number }>(
      `SELECT m.nama AS label, SUM(p.qty) AS count
         FROM prescriptions p JOIN medicines m ON m.id = p.medicine_id
        GROUP BY p.medicine_id ORDER BY count DESC LIMIT 10`,
    )
    .all();

  return {
    nilaiStok,
    lowStockCount,
    nearExpiryCount: nearExpiry.length,
    fastMoving,
    nearExpiry,
  };
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
