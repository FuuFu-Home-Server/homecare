import { getDb } from "@/lib/db/client";
import { getPrescriptions } from "@/lib/db/inventory";
import { nowWIB, umur } from "@/lib/format";
import type {
  AccessAction,
  AntrianStatus,
  InterventionKategori,
  Jaminan,
  JenisKelamin,
  MedicalRecordExportRow,
  RecordAccessLog,
  SoapInput,
  SoapNote,
  VisitIntervention,
} from "@/types";

// ===== SOAP (append-only, Permenkes 24/2022) =====
interface SoapRow {
  id: number;
  visit_id: number;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  doctor_id: number;
  created_at: string;
  amends_id: number | null;
}

function toSoap(r: SoapRow): SoapNote {
  return {
    id: r.id,
    visitId: r.visit_id,
    subjective: r.subjective,
    objective: r.objective,
    assessment: r.assessment,
    plan: r.plan,
    doctorId: r.doctor_id,
    createdAt: r.created_at,
    amendsId: r.amends_id,
  };
}

export function getSoapNotes(visitId: number): SoapNote[] {
  return getDb()
    .prepare<[number], SoapRow>("SELECT * FROM soap_notes WHERE visit_id = ? ORDER BY id ASC")
    .all(visitId)
    .map(toSoap);
}

/**
 * Append a SOAP note. Records are NEVER updated or deleted — a correction is a
 * brand-new row whose `amends_id` points at the note it supersedes, preserving
 * the full audit chain. The caller passes `amendsId` when amending.
 */
export function createSoapNote(visitId: number, doctorId: number, input: SoapInput): SoapNote {
  const db = getDb();
  const res = db
    .prepare<
      [number, string | null, string | null, string | null, string | null, number, string, number | null]
    >(
      `INSERT INTO soap_notes (visit_id, subjective, objective, assessment, plan, doctor_id, created_at, amends_id)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .run(
      visitId,
      input.subjective,
      input.objective,
      input.assessment,
      input.plan,
      doctorId,
      nowWIB(),
      input.amendsId,
    );
  logAccess(visitId, doctorId, input.amendsId ? "amend" : "create", "Catatan SOAP");
  const created = db
    .prepare<[number], SoapRow>("SELECT * FROM soap_notes WHERE id = ?")
    .get(Number(res.lastInsertRowid));
  if (!created) throw new Error("Gagal menyimpan catatan.");
  return toSoap(created);
}

// ===== Nursing interventions (asuhan keperawatan) =====
interface IntvRow {
  id: number;
  visit_id: number;
  kategori: InterventionKategori;
  label: string;
  created_at: string;
}

function toIntv(r: IntvRow): VisitIntervention {
  return {
    id: r.id,
    visitId: r.visit_id,
    kategori: r.kategori,
    label: r.label,
    createdAt: r.created_at,
  };
}

export function getInterventions(visitId: number): VisitIntervention[] {
  return getDb()
    .prepare<[number], IntvRow>(
      "SELECT * FROM visit_interventions WHERE visit_id = ? ORDER BY id ASC",
    )
    .all(visitId)
    .map(toIntv);
}

export function addIntervention(
  visitId: number,
  kategori: InterventionKategori,
  label: string,
): VisitIntervention {
  const db = getDb();
  const res = db
    .prepare<[number, InterventionKategori, string, string]>(
      "INSERT INTO visit_interventions (visit_id, kategori, label, created_at) VALUES (?,?,?,?)",
    )
    .run(visitId, kategori, label, nowWIB());
  const row = db
    .prepare<[number], IntvRow>("SELECT * FROM visit_interventions WHERE id = ?")
    .get(Number(res.lastInsertRowid));
  if (!row) throw new Error("Gagal menambah intervensi.");
  return toIntv(row);
}

export function removeIntervention(id: number): void {
  getDb().prepare<[number]>("DELETE FROM visit_interventions WHERE id = ?").run(id);
}

// ===== Access log =====
interface AccessRow {
  id: number;
  visit_id: number;
  user_id: number;
  action: AccessAction;
  detail: string | null;
  created_at: string;
}

export function logAccess(
  visitId: number,
  userId: number,
  action: AccessAction,
  detail: string | null,
): void {
  getDb()
    .prepare<[number, number, AccessAction, string | null, string]>(
      "INSERT INTO record_access_log (visit_id, user_id, action, detail, created_at) VALUES (?,?,?,?,?)",
    )
    .run(visitId, userId, action, detail, nowWIB());
}

export function getAccessLog(visitId: number): RecordAccessLog[] {
  return getDb()
    .prepare<[number], AccessRow>(
      "SELECT * FROM record_access_log WHERE visit_id = ? ORDER BY id DESC LIMIT 50",
    )
    .all(visitId)
    .map((r) => ({
      id: r.id,
      visitId: r.visit_id,
      userId: r.user_id,
      action: r.action,
      detail: r.detail,
      createdAt: r.created_at,
    }));
}

// ===== Riwayat rekam medis export =====
interface ExportRow {
  visitId: number;
  tanggal: string;
  status: AntrianStatus;
  keluhan: string | null;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
  noRm: string;
  nik: string;
  pasien: string;
  tglLahir: string;
  jenisKelamin: JenisKelamin;
  jaminan: Jaminan;
  bpjsNo: string | null;
  alamat: string | null;
  telepon: string | null;
  agama: string | null;
  pekerjaan: string | null;
  pendidikan: string | null;
  statusNikah: string | null;
  alergi: string | null;
  riwayatKeluarga: string | null;
  merokok: string | null;
  alkohol: string | null;
  polaMakan: string | null;
}

interface TindakanRow {
  deskripsi: string;
  qty: number;
}

/**
 * Flat rows for the "Riwayat Rekam Medis" Excel export. Patient demographics
 * plus each clinical section (vitals, SOAP, asuhan, resep, tindakan) as its own
 * column, so the record is fully analysable in a spreadsheet.
 */
export function getMedicalRecordExport(from: string, to: string): MedicalRecordExportRow[] {
  const db = getDb();
  const visits = db
    .prepare<[string, string, string, string], ExportRow>(
      `SELECT v.id AS visitId, v.tanggal AS tanggal, v.status AS status, v.keluhan_utama AS keluhan,
              v.td_sistol AS tdSistol, v.td_diastol AS tdDiastol, v.suhu AS suhu,
              v.berat AS berat, v.tinggi AS tinggi,
              p.no_rm AS noRm, p.nik AS nik, p.nama AS pasien, p.tgl_lahir AS tglLahir,
              p.jenis_kelamin AS jenisKelamin, p.jaminan AS jaminan, p.bpjs_no AS bpjsNo,
              p.alamat AS alamat, p.telepon AS telepon, p.alergi AS alergi,
              p.agama AS agama, p.pekerjaan AS pekerjaan, p.pendidikan AS pendidikan,
              p.status_nikah AS statusNikah, p.riwayat_keluarga AS riwayatKeluarga,
              p.merokok AS merokok, p.alkohol AS alkohol, p.pola_makan AS polaMakan
         FROM visits v JOIN patients p ON p.id = v.patient_id
        WHERE v.status != 'batal'
          AND (? = '' OR v.tanggal >= ?)
          AND (? = '' OR v.tanggal <= ?)
        ORDER BY v.tanggal DESC, v.nomor_antrian DESC`,
    )
    .all(from, from, to, to);

  const tindakanStmt = db.prepare<[number], TindakanRow>(
    `SELECT bi.deskripsi AS deskripsi, bi.qty AS qty
       FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
      WHERE b.visit_id = ? AND bi.tipe = 'tindakan' ORDER BY bi.id ASC`,
  );

  return visits.map((v) => {
    const soap = getSoapNotes(v.visitId).at(-1);
    const intv = getInterventions(v.visitId);
    const byKat = (k: InterventionKategori): string =>
      intv.filter((i) => i.kategori === k).map((i) => i.label).join(", ");

    return {
      tanggal: v.tanggal,
      noRm: v.noRm,
      nik: v.nik,
      pasien: v.pasien,
      tglLahir: v.tglLahir,
      umur: umur(v.tglLahir),
      jenisKelamin: v.jenisKelamin,
      jaminan: v.jaminan,
      bpjsNo: v.bpjsNo ?? "",
      alamat: v.alamat ?? "",
      telepon: v.telepon ?? "",
      agama: v.agama ?? "",
      pekerjaan: v.pekerjaan ?? "",
      pendidikan: v.pendidikan ?? "",
      statusNikah: v.statusNikah ?? "",
      alergi: v.alergi ?? "",
      riwayatKeluarga: v.riwayatKeluarga ?? "",
      merokok: v.merokok ?? "",
      alkohol: v.alkohol ?? "",
      polaMakan: v.polaMakan ?? "",
      keluhan: v.keluhan ?? "",
      status: v.status,
      td: v.tdSistol && v.tdDiastol ? `${v.tdSistol}/${v.tdDiastol}` : "",
      suhu: v.suhu != null ? String(v.suhu) : "",
      berat: v.berat != null ? String(v.berat) : "",
      tinggi: v.tinggi != null ? String(v.tinggi) : "",
      subjective: soap?.subjective ?? "",
      objective: soap?.objective ?? "",
      assessment: soap?.assessment ?? "",
      plan: soap?.plan ?? "",
      masalah: byKat("masalah"),
      etiologi: byKat("etiologi"),
      intervensi: byKat("intervensi"),
      resep: getPrescriptions(v.visitId).map((p) => `${p.nama} ${p.qty} ${p.satuan}`).join("; "),
      tindakan: tindakanStmt
        .all(v.visitId)
        .map((t) => (t.qty > 1 ? `${t.deskripsi} x${t.qty}` : t.deskripsi))
        .join("; "),
    };
  });
}
