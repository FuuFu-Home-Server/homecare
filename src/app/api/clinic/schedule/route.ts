import { NextResponse } from "next/server";
import { getSchedule, updateSchedule } from "@/lib/db/settings";
import { currentUser } from "@/lib/session";
import type { ScheduleDay } from "@/types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ schedule: getSchedule() });
}

function parse(data: unknown): ScheduleDay[] | string {
  if (typeof data !== "object" || data === null || !("schedule" in data)) return "Data tidak valid.";
  const { schedule } = data;
  if (!Array.isArray(schedule) || schedule.length !== 7) return "Jadwal harus 7 hari.";
  const out: ScheduleDay[] = [];
  for (const raw of schedule) {
    if (typeof raw !== "object" || raw === null) return "Baris jadwal tidak valid.";
    const rec: Record<string, unknown> = Object.fromEntries(Object.entries(raw));
    const day = typeof rec.day === "number" ? rec.day : -1;
    if (!Number.isInteger(day) || day < 0 || day > 6) return "Hari tidak valid.";
    if (!Array.isArray(rec.sessions)) return "Sesi tidak valid.";
    const sessions = [];
    for (const s of rec.sessions) {
      if (typeof s !== "object" || s === null) return "Sesi tidak valid.";
      const sr: Record<string, unknown> = Object.fromEntries(Object.entries(s));
      const jamBuka = typeof sr.jamBuka === "string" ? sr.jamBuka : "";
      const jamTutup = typeof sr.jamTutup === "string" ? sr.jamTutup : "";
      if (!TIME_RE.test(jamBuka) || !TIME_RE.test(jamTutup)) return "Format jam harus HH:MM.";
      if (jamTutup <= jamBuka) return "Jam tutup harus setelah jam buka.";
      sessions.push({ jamBuka, jamTutup });
    }
    out.push({ day, sessions });
  }
  return out;
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ schedule: updateSchedule(parsed) });
}
