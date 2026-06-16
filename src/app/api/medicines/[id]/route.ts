import { NextResponse } from "next/server";
import { getMedicineDetail } from "@/lib/db/inventory";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const detail = getMedicineDetail(Number(id));
  if (!detail) return NextResponse.json({ error: "Obat tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ detail });
}
