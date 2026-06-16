import { NextResponse } from "next/server";
import { createSoapNote } from "@/lib/db/records";
import { getVisit, updateStatus } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import type { SoapInput } from "@/types";

function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function parse(data: unknown): SoapInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const subjective = s(rec.subjective);
  const objective = s(rec.objective);
  const assessment = s(rec.assessment);
  const plan = s(rec.plan);
  if (!subjective && !objective && !assessment && !plan) {
    return "Minimal satu bagian SOAP harus diisi.";
  }
  const amendsId =
    typeof rec.amendsId === "number" && Number.isInteger(rec.amendsId) ? rec.amendsId : null;
  return { subjective, objective, assessment, plan, amendsId };
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
  const visitId = Number(id);
  const visit = getVisit(visitId);
  if (!visit) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const note = createSoapNote(visitId, user.userId, parsed);
  // Opening the consult moves the patient to "diperiksa".
  if (visit.status === "tiba") updateStatus(visitId, "diperiksa");
  return NextResponse.json({ note }, { status: 201 });
}
