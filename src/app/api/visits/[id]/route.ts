import { NextResponse } from "next/server";
import { getQueueEntry, updateStatus } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import { parseStatus } from "@/lib/validation/visit";

export async function PATCH(
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
  const parsed = parseStatus(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  updateStatus(visitId, parsed.status);
  return NextResponse.json({ entry: getQueueEntry(visitId) });
}
