import { NextResponse } from "next/server";
import { getConsultBundle } from "@/lib/db/consult";
import { logAccess } from "@/lib/db/records";
import { currentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const visitId = Number(id);
  const bundle = getConsultBundle(visitId);
  if (!bundle) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  // Compliance: record that this user opened the medical record.
  logAccess(visitId, user.userId, "view", "Membuka rekam medis");
  return NextResponse.json({ bundle });
}
