import { NextResponse } from "next/server";
import { createSoapNote } from "@/lib/db/records";
import { getVisit, updateStatus } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import { parseSoap } from "@/lib/validation/visit";

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
  const visit = getVisit(visitId);
  if (!visit) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  const parsed = parseSoap(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const note = createSoapNote(visitId, user.userId, parsed);
  // Opening the consult moves the patient to "diperiksa".
  if (visit.status === "tiba") updateStatus(visitId, "diperiksa");
  return NextResponse.json({ note }, { status: 201 });
}
