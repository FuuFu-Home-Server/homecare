import { NextResponse } from "next/server";
import { removeIntervention } from "@/lib/db/records";
import { currentUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const intvId = Number(id);
  if (!Number.isInteger(intvId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }
  removeIntervention(intvId);
  return NextResponse.json({ ok: true });
}
