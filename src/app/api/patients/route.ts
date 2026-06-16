import { NextResponse } from "next/server";
import { createPatient, findPatientByNik, listPatients } from "@/lib/db/patients";
import { parsePatientInput } from "@/lib/validation/patient";
import { currentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ patients: listPatients() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parsePatientInput(await request.json().catch(() => null));
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }
  if (findPatientByNik(parsed.nik)) {
    return NextResponse.json({ error: "NIK sudah terdaftar." }, { status: 409 });
  }

  const patient = createPatient(parsed);
  return NextResponse.json({ patient }, { status: 201 });
}
