import { NextResponse } from "next/server";
import { addIntervention } from "@/lib/db/records";
import { getVisit } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import { parseIntervention } from "@/lib/validation/visit";

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

  const parsed = parseIntervention(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json(
    { intervention: addIntervention(visitId, parsed.kategori, parsed.label) },
    { status: 201 },
  );
}
