import { z } from "zod";
import { numLike, optNum, optText, parse, reqText } from "@/lib/validation/common";
import type { AntrianStatus, InterventionKategori, SoapInput, VitalsInput } from "@/types";

const vitalsSchema = z.object({
  keluhanUtama: reqText("Keluhan utama wajib diisi."),
  tdSistol: optNum,
  tdDiastol: optNum,
  suhu: optNum,
  berat: optNum,
  tinggi: optNum,
});

const interventionSchema = z.object({
  kategori: z.enum(["masalah", "etiologi", "intervensi"], {
    error: "Kategori intervensi tidak valid.",
  }),
  label: reqText("Label wajib diisi."),
});

const soapSchema = z
  .object({
    subjective: optText,
    objective: optText,
    assessment: optText,
    plan: optText,
    amendsId: z.preprocess(
      (v) => (typeof v === "number" && Number.isInteger(v) ? v : null),
      z.number().int().nullable(),
    ),
  })
  .refine(
    (o) => Boolean(o.subjective || o.objective || o.assessment || o.plan),
    "Minimal satu bagian SOAP harus diisi.",
  );

export function parseVitals(data: unknown): VitalsInput | string {
  return parse(vitalsSchema, data);
}

export function parseIntervention(
  data: unknown,
): { kategori: InterventionKategori; label: string } | string {
  return parse(interventionSchema, data);
}

export function parseSoap(data: unknown): SoapInput | string {
  return parse(soapSchema, data);
}

const bookingSchema = z.object({
  patientId: numLike(z.number({ error: "Pasien wajib dipilih." }).int("Pasien tidak valid.")),
  keluhan: optText,
});

export function parseBooking(data: unknown): { patientId: number; keluhan: string | null } | string {
  return parse(bookingSchema, data);
}

const statusSchema = z.object({
  status: z.enum(["terdaftar", "tiba", "diperiksa", "selesai", "batal"], {
    error: "Status tidak valid.",
  }),
});

export function parseStatus(data: unknown): { status: AntrianStatus } | string {
  return parse(statusSchema, data);
}

