import { getDb } from "@/lib/db/client";
import { nowWIB, todayWIB } from "@/lib/format";
import type { PayrollRow, Role } from "@/types";

interface PayrollQueryRow {
  userId: number;
  nama: string;
  role: Role;
  gaji: number | null;
  jumlah: number | null;
  paidAt: string | null;
}

/** Salary status for every active staff member in a "YYYY-MM" month (WIB). */
export function listPayroll(bulan: string): PayrollRow[] {
  return getDb()
    .prepare<[string], PayrollQueryRow>(
      `SELECT u.id AS userId, u.nama AS nama, u.role AS role, u.gaji AS gaji,
              sp.jumlah AS jumlah, sp.paid_at AS paidAt
         FROM users u
         LEFT JOIN salary_payments sp ON sp.user_id = u.id AND sp.bulan = ?
        WHERE u.aktif = 1 AND u.role != 'perawat'
        ORDER BY u.nama ASC`,
    )
    .all(bulan)
    .map((r) => ({
      userId: r.userId,
      nama: r.nama,
      role: r.role,
      gaji: r.gaji,
      status: r.paidAt ? "lunas" : "belum",
      jumlah: r.jumlah,
      paidAt: r.paidAt,
    }));
}

/**
 * Mark a staff salary as paid for a month: snapshots the amount, records the
 * payment, and posts a matching "Gaji" expense so it flows into Laporan.
 * Idempotent guard via the UNIQUE(user_id, bulan) constraint.
 */
export function markSalaryPaid(userId: number, bulan: string, paidBy: number): void {
  const db = getDb();
  const staff = db
    .prepare<[number], { nama: string; gaji: number | null; role: Role }>(
      "SELECT nama, gaji, role FROM users WHERE id = ?",
    )
    .get(userId);
  if (!staff) throw new Error("Staf tidak ditemukan.");
  if (staff.role === "perawat") throw new Error("Perawat (pemilik) tidak termasuk penggajian.");
  if (staff.gaji == null || staff.gaji <= 0) throw new Error("Gaji staf belum diatur.");

  const exists = db
    .prepare<[number, string], { id: number }>(
      "SELECT id FROM salary_payments WHERE user_id = ? AND bulan = ?",
    )
    .get(userId, bulan);
  if (exists) throw new Error("Gaji bulan ini sudah ditandai lunas.");

  const jumlah = staff.gaji;
  const now = nowWIB();

  db.transaction(() => {
    const exp = db
      .prepare<[string, string, string, number, number, string]>(
        `INSERT INTO expenses (tanggal, kategori, deskripsi, jumlah, created_by, created_at)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(todayWIB(), "Gaji", `Gaji ${staff.nama} (${bulan})`, jumlah, paidBy, now);

    db.prepare<[number, string, number, number, string, number]>(
      `INSERT INTO salary_payments (user_id, bulan, jumlah, expense_id, paid_at, paid_by)
       VALUES (?,?,?,?,?,?)`,
    ).run(userId, bulan, jumlah, Number(exp.lastInsertRowid), now, paidBy);
  })();
}

/** Undo a salary payment: removes the payment record and its linked expense. */
export function unmarkSalaryPaid(userId: number, bulan: string): void {
  const db = getDb();
  const row = db
    .prepare<[number, string], { id: number; expense_id: number | null }>(
      "SELECT id, expense_id FROM salary_payments WHERE user_id = ? AND bulan = ?",
    )
    .get(userId, bulan);
  if (!row) return;

  db.transaction(() => {
    db.prepare<[number]>("DELETE FROM salary_payments WHERE id = ?").run(row.id);
    if (row.expense_id != null) {
      db.prepare<[number]>("DELETE FROM expenses WHERE id = ?").run(row.expense_id);
    }
  })();
}
