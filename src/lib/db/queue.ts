import { getDb } from "@/lib/db/client";
import { nowWIB, todayWIB } from "@/lib/format";
import type { AntrianStatus, QueueEntry, Visit, VitalsInput } from "@/types";

interface QueueRow {
  visitId: number;
  nomorAntrian: number;
  status: AntrianStatus;
  keluhanUtama: string | null;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
  tanggal: string;
  createdAt: string;
  patientId: number;
  nama: string;
  noRm: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: QueueEntry["jenisKelamin"];
  jaminan: QueueEntry["jaminan"];
  alergi: string | null;
}

const QUEUE_SELECT = `
  SELECT v.id AS visitId, v.nomor_antrian AS nomorAntrian, v.status AS status,
         v.keluhan_utama AS keluhanUtama, v.td_sistol AS tdSistol, v.td_diastol AS tdDiastol,
         v.suhu AS suhu, v.berat AS berat, v.tinggi AS tinggi,
         v.tanggal AS tanggal, v.created_at AS createdAt,
         p.id AS patientId, p.nama AS nama, p.no_rm AS noRm, p.nik AS nik, p.tgl_lahir AS tglLahir,
         p.jenis_kelamin AS jenisKelamin, p.jaminan AS jaminan, p.alergi AS alergi
    FROM visits v
    JOIN patients p ON p.id = v.patient_id`;

function toEntry(r: QueueRow): QueueEntry {
  return { ...r, hasVitals: r.suhu !== null || r.tdSistol !== null };
}

export function getQueueByDate(tanggal: string): QueueEntry[] {
  return getDb()
    .prepare<[string], QueueRow>(`${QUEUE_SELECT} WHERE v.tanggal = ? ORDER BY v.nomor_antrian ASC`)
    .all(tanggal)
    .map(toEntry);
}

/** Queue rows ready for examination: arrived/in-progress, today, vitals taken. */
export function getClinicalQueue(tanggal: string): QueueEntry[] {
  return getDb()
    .prepare<[string], QueueRow>(
      `${QUEUE_SELECT} WHERE v.tanggal = ? AND v.status IN ('tiba','diperiksa')
        ORDER BY v.nomor_antrian ASC`,
    )
    .all(tanggal)
    .map(toEntry);
}

/** Every visit across all dates/patients, newest first — the full record list. */
export function getAllRecords(limit = 500): QueueEntry[] {
  return getDb()
    .prepare<[number], QueueRow>(
      `${QUEUE_SELECT} ORDER BY v.tanggal DESC, v.nomor_antrian DESC LIMIT ?`,
    )
    .all(limit)
    .map(toEntry);
}

export function getQueueEntry(visitId: number): QueueEntry | null {
  const row = getDb()
    .prepare<[number], QueueRow>(`${QUEUE_SELECT} WHERE v.id = ?`)
    .get(visitId);
  return row ? toEntry(row) : null;
}

interface VisitRow {
  id: number;
  patient_id: number;
  tanggal: string;
  nomor_antrian: number;
  status: AntrianStatus;
  keluhan_utama: string | null;
  td_sistol: number | null;
  td_diastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
  created_by: number;
  created_at: string;
}

function toVisit(r: VisitRow): Visit {
  return {
    id: r.id,
    patientId: r.patient_id,
    tanggal: r.tanggal,
    nomorAntrian: r.nomor_antrian,
    status: r.status,
    keluhanUtama: r.keluhan_utama,
    tdSistol: r.td_sistol,
    tdDiastol: r.td_diastol,
    suhu: r.suhu,
    berat: r.berat,
    tinggi: r.tinggi,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

export function getVisit(id: number): Visit | null {
  const row = getDb().prepare<[number], VisitRow>("SELECT * FROM visits WHERE id = ?").get(id);
  return row ? toVisit(row) : null;
}

/** Create a booking: next queue number for today, status terdaftar. */
export function createBooking(patientId: number, keluhan: string | null, createdBy: number): Visit {
  const db = getDb();
  const today = todayWIB();
  const make = db.transaction((): Visit => {
    const maxRow = db
      .prepare<[string], { m: number | null }>(
        "SELECT MAX(nomor_antrian) m FROM visits WHERE tanggal = ?",
      )
      .get(today);
    const nomor = (maxRow?.m ?? 0) + 1;
    const res = db
      .prepare<[number, string, number, string | null, number, string]>(
        `INSERT INTO visits (patient_id, tanggal, nomor_antrian, keluhan_utama, created_by, created_at)
         VALUES (?,?,?,?,?,?)`,
      )
      .run(patientId, today, nomor, keluhan, createdBy, nowWIB());
    const created = getVisit(Number(res.lastInsertRowid));
    if (!created) throw new Error("Gagal membuat booking.");
    return created;
  });
  return make();
}

const ALLOWED: ReadonlyArray<AntrianStatus> = [
  "terdaftar",
  "tiba",
  "diperiksa",
  "selesai",
  "batal",
];

export function updateStatus(visitId: number, status: AntrianStatus): void {
  if (!ALLOWED.includes(status)) throw new Error("Status tidak valid.");
  getDb()
    .prepare<[AntrianStatus, number]>("UPDATE visits SET status = ? WHERE id = ?")
    .run(status, visitId);
}

/** Record vitals + keluhan, then mark the patient ready for the doctor (tiba). */
export function recordVitals(visitId: number, v: VitalsInput): void {
  getDb()
    .prepare<
      [string, number | null, number | null, number | null, number | null, number | null, number]
    >(
      `UPDATE visits
          SET keluhan_utama = ?, td_sistol = ?, td_diastol = ?, suhu = ?, berat = ?, tinggi = ?,
              status = CASE WHEN status = 'terdaftar' THEN 'tiba' ELSE status END
        WHERE id = ?`,
    )
    .run(v.keluhanUtama, v.tdSistol, v.tdDiastol, v.suhu, v.berat, v.tinggi, visitId);
}
