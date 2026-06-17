import { z } from "zod";
import { parse, reqText } from "@/lib/validation/common";
import type { ClinicConfig } from "@/lib/config";
import type { ScheduleDay } from "@/types";

const REQUIRED = "Semua field profil praktik wajib diisi.";
const optStr = z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string());

const clinicSchema = z.object({
  nama: reqText(REQUIRED),
  penanggungJawab: reqText(REQUIRED),
  sipp: reqText(REQUIRED),
  alamat: reqText(REQUIRED),
  kota: reqText(REQUIRED),
  telepon: reqText(REQUIRED),
  appTitle: optStr,
  strukFooter: optStr,
  strukFooter2: optStr,
});

export function parseClinic(data: unknown): ClinicConfig | string {
  return parse(clinicSchema, data);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().regex(TIME_RE, "Format jam harus HH:MM.");

const session = z
  .object({ jamBuka: time, jamTutup: time })
  .refine((s) => s.jamTutup > s.jamBuka, "Jam tutup harus setelah jam buka.");

const scheduleDay = z.object({
  day: z.number({ error: "Hari tidak valid." }).int("Hari tidak valid.").min(0, "Hari tidak valid.").max(6, "Hari tidak valid."),
  sessions: z.array(session),
});

const scheduleSchema = z
  .object({ schedule: z.array(scheduleDay).length(7, "Jadwal harus 7 hari.") })
  .transform((o): ScheduleDay[] => o.schedule);

export function parseSchedule(data: unknown): ScheduleDay[] | string {
  return parse(scheduleSchema, data);
}
