import { NextResponse } from "next/server";
import { getQueueEntry, recordVitals } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import type { VitalsInput } from "@/types";

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function parseVitals(data: unknown): VitalsInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const keluhanUtama =
    typeof rec.keluhanUtama === "string" ? rec.keluhanUtama.trim() : "";
  if (!keluhanUtama) return "Keluhan utama wajib diisi.";
  return {
    keluhanUtama,
    tdSistol: numOrNull(rec.tdSistol),
    tdDiastol: numOrNull(rec.tdDiastol),
    suhu: numOrNull(rec.suhu),
    berat: numOrNull(rec.berat),
    tinggi: numOrNull(rec.tinggi),
  };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const visitId = Number(id);
  if (!getQueueEntry(visitId)) {
    return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });
  }
  const parsed = parseVitals(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  recordVitals(visitId, parsed);
  return NextResponse.json({ entry: getQueueEntry(visitId) });
}
