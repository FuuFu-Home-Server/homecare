import { CONFIG } from "@/lib/config";

/** Format an integer rupiah amount as "Rp 50.000". */
export function rupiah(amount: number): string {
  return new Intl.NumberFormat(CONFIG.locale, {
    style: "currency",
    currency: CONFIG.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Group a raw digit string (or number) with locale thousand separators, e.g. "1500000" → "1.500.000". Non-digits are stripped. */
export function formatThousands(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (digits === "") return "";
  return new Intl.NumberFormat(CONFIG.locale).format(Number(digits));
}

/** Format an ISO date/datetime as DD/MM/YYYY (WIB). */
export function tglWIB(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: CONFIG.timezone,
  }).format(d);
}

/** Format an ISO datetime as DD/MM/YYYY HH:mm (WIB). */
export function tglJamWIB(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CONFIG.timezone,
  }).format(d);
}

/** "YYYY-MM-DD" for the current day in WIB. */
export function todayWIB(): string {
  return nowWIB().slice(0, 10);
}

/** Full ISO-ish timestamp in WIB, e.g. "2026-06-15T09:30:00". */
export function nowWIB(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: CONFIG.timezone,
  }).formatToParts(new Date());
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Group a 16-digit NIK as "3273 0101 9001 0001" for display. */
export function formatNik(nik: string): string {
  return nik.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Age in whole years from a "YYYY-MM-DD" birth date. */
export function umur(tglLahir: string): number {
  const birth = new Date(tglLahir);
  const now = new Date(todayWIB());
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Current WIB weekday (0 = Minggu .. 6 = Sabtu) and "HH:MM" time. */
export function nowWIBParts(): { day: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { day: dayMap[get("weekday")] ?? 0, time: `${hour}:${get("minute")}` };
}

/** "YYYY-MM" for the current month in WIB. */
export function monthWIB(): string {
  return todayWIB().slice(0, 7);
}

/** Array of the last `n` day strings (YYYY-MM-DD) in WIB, oldest first, ending today. */
export function lastNDaysWIB(n: number): string[] {
  const out: string[] = [];
  const base = new Date(`${todayWIB()}T00:00:00`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86_400_000);
    out.push(
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }).format(d),
    );
  }
  return out;
}

/** Short "DD/MM" label for chart axes. */
export function tglPendek(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/** Whole days from today (WIB) until an ISO "YYYY-MM-DD" date. Negative = past. */
export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date(`${todayWIB()}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
