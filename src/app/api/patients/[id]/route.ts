import { NextResponse } from "next/server";
import {
  countVisitsForPatient,
  deletePatient,
  findPatientByNik,
  getPatient,
  getPatientHistory,
  updatePatient,
} from "@/lib/db/patients";
import { parsePatientInput } from "@/lib/validation/patient";
import { currentUser } from "@/lib/session";

async function resolveId(ctx: { params: Promise<{ id: string }> }): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const id = await resolveId(ctx);
  if (id === null) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const patient = getPatient(id);
  if (!patient) return NextResponse.json({ error: "Pasien tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ patient, history: getPatientHistory(id) });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const id = await resolveId(ctx);
  if (id === null) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  if (!getPatient(id)) return NextResponse.json({ error: "Pasien tidak ditemukan." }, { status: 404 });

  const parsed = parsePatientInput(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const existing = findPatientByNik(parsed.nik);
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "NIK sudah dipakai pasien lain." }, { status: 409 });
  }

  return NextResponse.json({ patient: updatePatient(id, parsed) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const id = await resolveId(ctx);
  if (id === null) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  if (!getPatient(id)) return NextResponse.json({ error: "Pasien tidak ditemukan." }, { status: 404 });

  // Append-only norms: never delete a patient who already has visit history.
  if (countVisitsForPatient(id) > 0) {
    return NextResponse.json(
      { error: "Pasien punya riwayat kunjungan dan tidak bisa dihapus." },
      { status: 409 },
    );
  }

  deletePatient(id);
  return NextResponse.json({ ok: true });
}
