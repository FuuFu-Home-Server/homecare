import { z } from "zod";
import { optEnum, optText, parse, reqText } from "@/lib/validation/common";
import type {
  Agama,
  Alkohol,
  CreatePatientInput,
  Merokok,
  Pendidikan,
  StatusNikah,
} from "@/types";

const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] as const satisfies readonly Agama[];
const PENDIDIKAN = ["Tidak Sekolah", "SD", "SMP", "SMA", "D3", "S1", "S2", "S3"] as const satisfies readonly Pendidikan[];
const STATUS_NIKAH = ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"] as const satisfies readonly StatusNikah[];
const MEROKOK = ["Tidak Merokok", "Perokok Aktif", "Mantan Perokok"] as const satisfies readonly Merokok[];
const ALKOHOL = ["Tidak", "Kadang-kadang", "Sering"] as const satisfies readonly Alkohol[];

const patientSchema = z
  .object({
    nik: z
      .string({ error: "NIK harus 16 digit angka." })
      .trim()
      .regex(/^\d{16}$/, "NIK harus 16 digit angka."),
    nama: reqText("Nama wajib diisi."),
    tglLahir: reqText("Tanggal lahir wajib diisi."),
    jenisKelamin: z.enum(["L", "P"], { error: "Jenis kelamin tidak valid." }),
    jaminan: z.enum(["umum", "bpjs"], { error: "Jenis jaminan tidak valid." }),
    alamat: optText,
    telepon: optText,
    bpjsNo: optText,
    alergi: optText,
    agama: optEnum(AGAMA),
    pekerjaan: optText,
    pendidikan: optEnum(PENDIDIKAN),
    statusNikah: optEnum(STATUS_NIKAH),
    riwayatKeluarga: optText,
    merokok: optEnum(MEROKOK),
    alkohol: optEnum(ALKOHOL),
    polaMakan: optText,
  })
  .transform(
    (o): CreatePatientInput => ({
      ...o,
      bpjsNo: o.jaminan === "bpjs" ? o.bpjsNo : null,
    }),
  );

/** Validate raw JSON into a CreatePatientInput, or return an error message. */
export function parsePatientInput(data: unknown): CreatePatientInput | string {
  return parse(patientSchema, data);
}
