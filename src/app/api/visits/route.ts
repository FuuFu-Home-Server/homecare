import { NextResponse } from "next/server";
import { createBooking, getAllRecords, getClinicalQueue, getQueueByDate } from "@/lib/db/queue";
import { getPatient } from "@/lib/db/patients";
import { currentUser } from "@/lib/session";
import { parseBooking } from "@/lib/validation/visit";
import { todayWIB } from "@/lib/format";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const tanggal = url.searchParams.get("date") ?? todayWIB();
  const scope = url.searchParams.get("scope");
  const queue =
    scope === "riwayat"
      ? getAllRecords()
      : scope === "perawat"
        ? getClinicalQueue(tanggal)
        : getQueueByDate(tanggal);
  return NextResponse.json({ queue });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const parsed = parseBooking(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  if (!getPatient(parsed.patientId)) {
    return NextResponse.json({ error: "Pasien tidak ditemukan." }, { status: 404 });
  }

  const visit = createBooking(parsed.patientId, parsed.keluhan, user.userId);
  return NextResponse.json({ visit }, { status: 201 });
}
