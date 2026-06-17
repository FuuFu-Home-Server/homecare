import { NextResponse } from "next/server";
import { adjustBatch } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";
import { parseAdjust } from "@/lib/validation/inventory";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = parseAdjust(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  try {
    adjustBatch(Number(id), parsed.delta, parsed.alasan, user.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
