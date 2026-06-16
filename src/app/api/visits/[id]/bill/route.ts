import { NextResponse } from "next/server";
import { getBillBundle, listTreatments } from "@/lib/db/billing";
import { currentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const bundle = getBillBundle(Number(id));
  if (!bundle) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  return NextResponse.json({ bundle, treatments: listTreatments() });
}
