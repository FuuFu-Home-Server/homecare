import { NextResponse } from "next/server";
import { getQueueEntry, recordVitals } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import { parseVitals } from "@/lib/validation/visit";

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
