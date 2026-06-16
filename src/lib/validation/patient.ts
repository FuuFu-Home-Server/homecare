import type {
  Agama,
  Alkohol,
  CreatePatientInput,
  JenisKelamin,
  Jaminan,
  Merokok,
  Pendidikan,
  StatusNikah,
} from "@/types";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

const AGAMA: ReadonlyArray<Agama> = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];
const PENDIDIKAN: ReadonlyArray<Pendidikan> = ["Tidak Sekolah", "SD", "SMP", "SMA", "D3", "S1", "S2", "S3"];
const STATUS_NIKAH: ReadonlyArray<StatusNikah> = ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"];
const MEROKOK: ReadonlyArray<Merokok> = ["Tidak Merokok", "Perokok Aktif", "Mantan Perokok"];
const ALKOHOL: ReadonlyArray<Alkohol> = ["Tidak", "Kadang-kadang", "Sering"];

function oneOf<T extends string>(v: unknown, allowed: ReadonlyArray<T>): T | null {
  return typeof v === "string" ? allowed.find((a) => a === v) ?? null : null;
}

/** Validate raw JSON into a CreatePatientInput, or return an error message. */
export function parsePatientInput(data: unknown): CreatePatientInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));

  const nik = str(rec.nik);
  if (!nik || !/^\d{16}$/.test(nik)) return "NIK harus 16 digit angka.";
  const nama = str(rec.nama);
  if (!nama) return "Nama wajib diisi.";
  const tglLahir = str(rec.tglLahir);
  if (!tglLahir) return "Tanggal lahir wajib diisi.";

  const jk = rec.jenisKelamin;
  if (jk !== "L" && jk !== "P") return "Jenis kelamin tidak valid.";
  const jaminan = rec.jaminan;
  if (jaminan !== "umum" && jaminan !== "bpjs") return "Jenis jaminan tidak valid.";

  const jenisKelamin: JenisKelamin = jk;
  const jam: Jaminan = jaminan;

  return {
    nik,
    nama,
    tglLahir,
    jenisKelamin,
    jaminan: jam,
    alamat: str(rec.alamat),
    telepon: str(rec.telepon),
    bpjsNo: jam === "bpjs" ? str(rec.bpjsNo) : null,
    alergi: str(rec.alergi),
    agama: oneOf(rec.agama, AGAMA),
    pekerjaan: str(rec.pekerjaan),
    pendidikan: oneOf(rec.pendidikan, PENDIDIKAN),
    statusNikah: oneOf(rec.statusNikah, STATUS_NIKAH),
    riwayatKeluarga: str(rec.riwayatKeluarga),
    merokok: oneOf(rec.merokok, MEROKOK),
    alkohol: oneOf(rec.alkohol, ALKOHOL),
    polaMakan: str(rec.polaMakan),
  };
}
