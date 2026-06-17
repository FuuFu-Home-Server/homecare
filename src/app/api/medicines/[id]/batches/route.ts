import { NextResponse } from "next/server";
import { addBatch, getMedicineDetail } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";
import { parseBatch } from "@/lib/validation/inventory";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const medicineId = Number(id);
  if (!getMedicineDetail(medicineId)) {
    return NextResponse.json({ error: "Obat tidak ditemukan." }, { status: 404 });
  }
  const parsed = parseBatch(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  addBatch(medicineId, parsed, user.userId);
  return NextResponse.json({ detail: getMedicineDetail(medicineId) }, { status: 201 });
}
