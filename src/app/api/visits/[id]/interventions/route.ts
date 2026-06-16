import { NextResponse } from "next/server";
import { addIntervention } from "@/lib/db/records";
import { getVisit } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import type { InterventionKategori } from "@/types";

const KATEGORI: ReadonlyArray<InterventionKategori> = ["masalah", "etiologi", "intervensi"];

function parse(data: unknown): { kategori: InterventionKategori; label: string } | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const kategori = KATEGORI.find((k) => k === rec.kategori);
  const label = typeof rec.label === "string" ? rec.label.trim() : "";
  if (!kategori) return "Kategori intervensi tidak valid.";
  if (!label) return "Label wajib diisi.";
  return { kategori, label };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const visitId = Number(id);
  if (!getVisit(visitId)) {
    return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });
  }

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json(
    { intervention: addIntervention(visitId, parsed.kategori, parsed.label) },
    { status: 201 },
  );
}
