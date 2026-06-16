import { NextResponse } from "next/server";
import { getMedicalRecordExport } from "@/lib/db/records";
import { currentUser } from "@/lib/session";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from") ?? "";
  const toRaw = url.searchParams.get("to") ?? "";
  const from = DATE.test(fromRaw) ? fromRaw : "";
  const to = DATE.test(toRaw) ? toRaw : "";

  return NextResponse.json({ rows: getMedicalRecordExport(from, to) });
}
