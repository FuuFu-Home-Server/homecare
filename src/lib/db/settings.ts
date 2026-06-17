import { getDb } from "@/lib/db/client";
import { CONFIG, type ClinicConfig } from "@/lib/config";
import { nowWIBParts } from "@/lib/format";
import type { ScheduleDay, ScheduleStatus, TodaySession } from "@/types";

interface ClinicRow {
  nama: string;
  penanggungJawab: string;
  sipp: string;
  alamat: string;
  kota: string;
  telepon: string;
  appTitle: string;
  strukFooter: string;
  strukFooter2: string;
}

/** Current clinic identity from the DB, falling back to config defaults. */
export function getClinic(): ClinicConfig {
  const row = getDb()
    .prepare<[], ClinicRow>(
      `SELECT nama, penanggung_jawab AS penanggungJawab, sipp, alamat, kota, telepon,
              app_title AS appTitle, struk_footer AS strukFooter, struk_footer2 AS strukFooter2
         FROM clinic_settings WHERE id = 1`,
    )
    .get();
  return row ?? CONFIG.clinic;
}

export function updateClinic(input: ClinicConfig): ClinicConfig {
  getDb()
    .prepare<[string, string, string, string, string, string, string, string, string]>(
      // Upsert: a freshly-bootstrapped DB has no clinic_settings row yet (the
      // setup wizard is the first writer), so plain UPDATE would no-op.
      `INSERT INTO clinic_settings
         (id, nama, penanggung_jawab, sipp, alamat, kota, telepon, app_title, struk_footer, struk_footer2)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nama = excluded.nama, penanggung_jawab = excluded.penanggung_jawab, sipp = excluded.sipp,
         alamat = excluded.alamat, kota = excluded.kota, telepon = excluded.telepon,
         app_title = excluded.app_title, struk_footer = excluded.struk_footer,
         struk_footer2 = excluded.struk_footer2`,
    )
    .run(
      input.nama,
      input.penanggungJawab,
      input.sipp,
      input.alamat,
      input.kota,
      input.telepon,
      input.appTitle,
      input.strukFooter,
      input.strukFooter2,
    );
  return getClinic();
}

// ===== Practice schedule (sessions per day) =====
interface SessionRow {
  day: number;
  jam_buka: string;
  jam_tutup: string;
}

/** Always returns 7 entries (day 0..6); a day with no sessions is closed. */
export function getSchedule(): ScheduleDay[] {
  const rows = getDb()
    .prepare<[], SessionRow>(
      "SELECT day, jam_buka, jam_tutup FROM clinic_schedule_session ORDER BY day ASC, jam_buka ASC",
    )
    .all();
  const days: ScheduleDay[] = Array.from({ length: 7 }, (_, day) => ({ day, sessions: [] }));
  for (const r of rows) days[r.day]?.sessions.push({ jamBuka: r.jam_buka, jamTutup: r.jam_tutup });
  return days;
}

export function updateSchedule(days: ScheduleDay[]): ScheduleDay[] {
  const db = getDb();
  const run = db.transaction((rows: ScheduleDay[]): void => {
    db.prepare("DELETE FROM clinic_schedule_session").run();
    const ins = db.prepare<[number, string, string]>(
      "INSERT INTO clinic_schedule_session (day, jam_buka, jam_tutup) VALUES (?,?,?)",
    );
    for (const d of rows) {
      for (const s of d.sessions) ins.run(d.day, s.jamBuka, s.jamTutup);
    }
  });
  run(days);
  return getSchedule();
}

/** Is the clinic open right now (WIB)? Returns today's sessions for display. */
export function getScheduleStatus(): ScheduleStatus {
  const { day, time } = nowWIBParts();
  const today = getSchedule()[day]?.sessions ?? [];
  const open = today.some((s) => time >= s.jamBuka && time <= s.jamTutup);
  return { open, today };
}

/** Today's sessions classified by current WIB time. */
export function getTodaySessions(): TodaySession[] {
  const { day, time } = nowWIBParts();
  const sessions = getSchedule()[day]?.sessions ?? [];
  return sessions.map((s, index) => {
    const status: TodaySession["status"] =
      time > s.jamTutup ? "passed" : time >= s.jamBuka ? "active" : "upcoming";
    return { index, jamBuka: s.jamBuka, jamTutup: s.jamTutup, status };
  });
}
