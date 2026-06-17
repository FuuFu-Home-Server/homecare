import { NextResponse } from "next/server";
import { dispensePrescriptions, getPrescriptions } from "@/lib/db/inventory";
import { getVisit } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import { parseDispense } from "@/lib/validation/inventory";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const visitId = Number(id);
  if (!getVisit(visitId)) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  const items = parseDispense(await request.json().catch(() => null));
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });

  const result = dispensePrescriptions(visitId, user.userId, items);
  return NextResponse.json({ ...result, prescriptions: getPrescriptions(visitId) }, { status: 201 });
}
