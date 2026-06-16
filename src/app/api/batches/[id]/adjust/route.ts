import { NextResponse } from "next/server";
import { adjustBatch } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";

function parse(data: unknown): { delta: number; alasan: string } | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const delta = typeof rec.delta === "number" ? rec.delta : Number(rec.delta);
  if (!Number.isInteger(delta) || delta === 0) return "Jumlah penyesuaian tidak valid.";
  const alasan = typeof rec.alasan === "string" && rec.alasan.trim() !== "" ? rec.alasan.trim() : "Penyesuaian stok";
  return { delta, alasan };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  try {
    adjustBatch(Number(id), parsed.delta, parsed.alasan, user.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
