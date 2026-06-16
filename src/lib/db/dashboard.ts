import { getDb } from "@/lib/db/client";
import { CONFIG } from "@/lib/config";
import { todayWIB, monthWIB, lastNDaysWIB, daysUntil } from "@/lib/format";
import type { DashboardData, LowStockItem, NearExpiryItem, TrendPoint } from "@/types";

/**
 * All dashboard aggregates in one place. Timestamps are stored as WIB-local
 * TEXT, so substr-on-date comparisons line up with todayWIB()/monthWIB().
 */
export function getDashboardData(): DashboardData {
  const db = getDb();
  const today = todayWIB();
  const month = monthWIB();

  const countRow = (sql: string, ...params: (string | number)[]): number => {
    const row = db.prepare<typeof params, { n: number }>(sql).get(...params);
    return row?.n ?? 0;
  };
  const sumRow = (sql: string, ...params: (string | number)[]): number => {
    const row = db.prepare<typeof params, { s: number | null }>(sql).get(...params);
    return row?.s ?? 0;
  };

  const antrianHariIni = countRow(
    "SELECT COUNT(*) n FROM visits WHERE tanggal = ? AND status != 'batal'",
    today,
  );
  const antrianAktif = countRow(
    "SELECT COUNT(*) n FROM visits WHERE tanggal = ? AND status IN ('terdaftar','tiba','diperiksa')",
    today,
  );
  const pendapatanHariIni = sumRow(
    "SELECT SUM(total) s FROM bills WHERE status = 'lunas' AND substr(paid_at,1,10) = ?",
    today,
  );
  const pendapatanBulanIni = sumRow(
    "SELECT SUM(total) s FROM bills WHERE status = 'lunas' AND substr(paid_at,1,7) = ?",
    month,
  );
  const jumlahPasien = countRow("SELECT COUNT(*) n FROM patients");
  const tagihanTertundaCount = countRow("SELECT COUNT(*) n FROM bills WHERE status = 'tertunda'");
  const tagihanTertundaTotal = sumRow("SELECT SUM(total) s FROM bills WHERE status = 'tertunda'");

  // Low stock: total remaining qty across batches per medicine, at/below threshold.
  const lowStock = db
    .prepare<[number], LowStockItem>(
      `SELECT m.id AS medicineId, m.nama AS nama, m.satuan AS satuan,
              COALESCE(SUM(b.qty), 0) AS totalQty
         FROM medicines m
         LEFT JOIN medicine_batches b ON b.medicine_id = m.id
        WHERE m.is_consumable = 0
        GROUP BY m.id
       HAVING totalQty <= ?
        ORDER BY totalQty ASC`,
    )
    .all(CONFIG.lowStockThreshold);

  // Near-expiry batches (still holding stock) within the configured window.
  const nearRows = db
    .prepare<[string], Omit<NearExpiryItem, "sisaHari">>(
      `SELECT b.id AS batchId, m.id AS medicineId, m.nama AS nama,
              b.no_batch AS noBatch, b.tgl_kadaluarsa AS tglKadaluarsa, b.qty AS qty
         FROM medicine_batches b
         JOIN medicines m ON m.id = b.medicine_id
        WHERE b.qty > 0 AND b.tgl_kadaluarsa <= ?
        ORDER BY b.tgl_kadaluarsa ASC`,
    )
    .all(addDays(today, CONFIG.nearExpiryDays));
  const nearExpiry: NearExpiryItem[] = nearRows.map((r) => ({
    ...r,
    sisaHari: daysUntil(r.tglKadaluarsa),
  }));

  return {
    antrianHariIni,
    antrianAktif,
    pendapatanHariIni,
    pendapatanBulanIni,
    jumlahPasien,
    tagihanTertundaCount,
    tagihanTertundaTotal,
    lowStock,
    nearExpiry,
    revenueTrend: trend(14, "revenue"),
    visitTrend: trend(14, "visits"),
  };
}

function trend(days: number, kind: "revenue" | "visits"): TrendPoint[] {
  const db = getDb();
  const dates = lastNDaysWIB(days);
  const map = new Map<string, number>(dates.map((d) => [d, 0]));

  if (kind === "revenue") {
    const rows = db
      .prepare<[string], { d: string; v: number }>(
        `SELECT substr(paid_at,1,10) AS d, SUM(total) AS v
           FROM bills WHERE status = 'lunas' AND substr(paid_at,1,10) >= ?
          GROUP BY d`,
      )
      .all(dates[0] ?? "");
    for (const r of rows) if (map.has(r.d)) map.set(r.d, r.v);
  } else {
    const rows = db
      .prepare<[string], { d: string; v: number }>(
        `SELECT tanggal AS d, COUNT(*) AS v
           FROM visits WHERE status != 'batal' AND tanggal >= ?
          GROUP BY d`,
      )
      .all(dates[0] ?? "");
    for (const r of rows) if (map.has(r.d)) map.set(r.d, r.v);
  }

  return dates.map((d) => ({ tanggal: d, value: map.get(d) ?? 0 }));
}

/** Add days to a "YYYY-MM-DD" string, returning the same format (UTC math). */
function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
