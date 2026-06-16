import { getDb } from "@/lib/db/client";
import { nowWIB } from "@/lib/format";
import type { CreatePatientInput, Patient, PatientHistoryItem } from "@/types";

interface PatientRow {
  id: number;
  no_rm: string;
  nik: string;
  nama: string;
  tgl_lahir: string;
  jenis_kelamin: Patient["jenisKelamin"];
  alamat: string | null;
  telepon: string | null;
  jaminan: Patient["jaminan"];
  bpjs_no: string | null;
  alergi: string | null;
  agama: Patient["agama"];
  pekerjaan: string | null;
  pendidikan: Patient["pendidikan"];
  status_nikah: Patient["statusNikah"];
  riwayat_keluarga: string | null;
  merokok: Patient["merokok"];
  alkohol: Patient["alkohol"];
  pola_makan: string | null;
  created_at: string;
}

function toPatient(r: PatientRow): Patient {
  return {
    id: r.id,
    noRm: r.no_rm,
    nik: r.nik,
    nama: r.nama,
    tglLahir: r.tgl_lahir,
    jenisKelamin: r.jenis_kelamin,
    alamat: r.alamat,
    telepon: r.telepon,
    jaminan: r.jaminan,
    bpjsNo: r.bpjs_no,
    alergi: r.alergi,
    agama: r.agama,
    pekerjaan: r.pekerjaan,
    pendidikan: r.pendidikan,
    statusNikah: r.status_nikah,
    riwayatKeluarga: r.riwayat_keluarga,
    merokok: r.merokok,
    alkohol: r.alkohol,
    polaMakan: r.pola_makan,
    createdAt: r.created_at,
  };
}

export function listPatients(): Patient[] {
  return getDb()
    .prepare<[], PatientRow>("SELECT * FROM patients ORDER BY nama ASC")
    .all()
    .map(toPatient);
}

export function getPatient(id: number): Patient | null {
  const row = getDb().prepare<[number], PatientRow>("SELECT * FROM patients WHERE id = ?").get(id);
  return row ? toPatient(row) : null;
}

export function findPatientByNik(nik: string): Patient | null {
  const row = getDb().prepare<[string], PatientRow>("SELECT * FROM patients WHERE nik = ?").get(nik);
  return row ? toPatient(row) : null;
}

/** Next sequential medical-record number: 6-digit zero-padded, unique, easy to recall. */
function nextNoRm(): string {
  const row = getDb()
    .prepare<[], { max: number | null }>(
      "SELECT MAX(CAST(no_rm AS INTEGER)) AS max FROM patients",
    )
    .get();
  return String((row?.max ?? 0) + 1).padStart(6, "0");
}

export function findPatientByNoRm(noRm: string): Patient | null {
  const row = getDb()
    .prepare<[string], PatientRow>("SELECT * FROM patients WHERE no_rm = ?")
    .get(noRm);
  return row ? toPatient(row) : null;
}

export function createPatient(input: CreatePatientInput): Patient {
  const db = getDb();
  const now = nowWIB();
  const make = db.transaction((): Patient => {
    const noRm = nextNoRm();
    const result = db
      .prepare<
        [string, string, string, string, string, string | null, string | null, string, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string]
      >(
        `INSERT INTO patients (no_rm, nik, nama, tgl_lahir, jenis_kelamin, alamat, telepon, jaminan, bpjs_no, alergi, agama, pekerjaan, pendidikan, status_nikah, riwayat_keluarga, merokok, alkohol, pola_makan, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        noRm,
        input.nik,
        input.nama,
        input.tglLahir,
        input.jenisKelamin,
        input.alamat,
        input.telepon,
        input.jaminan,
        input.bpjsNo,
        input.alergi,
        input.agama,
        input.pekerjaan,
        input.pendidikan,
        input.statusNikah,
        input.riwayatKeluarga,
        input.merokok,
        input.alkohol,
        input.polaMakan,
        now,
      );
    const created = getPatient(Number(result.lastInsertRowid));
    if (!created) throw new Error("Gagal membuat pasien.");
    return created;
  });
  return make();
}

export function updatePatient(id: number, input: CreatePatientInput): Patient {
  getDb()
    .prepare<
      [string, string, string, string, string | null, string | null, string, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, number]
    >(
      `UPDATE patients
          SET nik = ?, nama = ?, tgl_lahir = ?, jenis_kelamin = ?, alamat = ?, telepon = ?,
              jaminan = ?, bpjs_no = ?, alergi = ?, agama = ?, pekerjaan = ?, pendidikan = ?,
              status_nikah = ?, riwayat_keluarga = ?, merokok = ?, alkohol = ?, pola_makan = ?
        WHERE id = ?`,
    )
    .run(
      input.nik,
      input.nama,
      input.tglLahir,
      input.jenisKelamin,
      input.alamat,
      input.telepon,
      input.jaminan,
      input.bpjsNo,
      input.alergi,
      input.agama,
      input.pekerjaan,
      input.pendidikan,
      input.statusNikah,
      input.riwayatKeluarga,
      input.merokok,
      input.alkohol,
      input.polaMakan,
      id,
    );
  const updated = getPatient(id);
  if (!updated) throw new Error("Pasien tidak ditemukan.");
  return updated;
}

export function countVisitsForPatient(id: number): number {
  const row = getDb()
    .prepare<[number], { n: number }>("SELECT COUNT(*) n FROM visits WHERE patient_id = ?")
    .get(id);
  return row?.n ?? 0;
}

export function deletePatient(id: number): void {
  getDb().prepare<[number]>("DELETE FROM patients WHERE id = ?").run(id);
}

interface HistoryRow {
  visitId: number;
  tanggal: string;
  status: PatientHistoryItem["status"];
  keluhanUtama: string | null;
  masalah: string | null;
  total: number | null;
  billStatus: PatientHistoryItem["billStatus"];
}

/** Visit timeline: nursing problems (asuhan keperawatan) per visit. */
export function getPatientHistory(patientId: number): PatientHistoryItem[] {
  return getDb()
    .prepare<[number], HistoryRow>(
      `SELECT v.id AS visitId, v.tanggal AS tanggal, v.status AS status,
              v.keluhan_utama AS keluhanUtama,
              (SELECT GROUP_CONCAT(label) FROM visit_interventions WHERE visit_id = v.id AND kategori = 'masalah') AS masalah,
              b.total AS total, b.status AS billStatus
         FROM visits v
         LEFT JOIN bills b ON b.visit_id = v.id
        WHERE v.patient_id = ?
        ORDER BY v.tanggal DESC, v.id DESC`,
    )
    .all(patientId)
    .map(({ masalah, ...r }) => ({
      ...r,
      diagnoses: masalah ?? "",
    }));
}
