import { NextResponse } from "next/server";
import { getKasirQueue } from "@/lib/db/billing";
import { todayWIB } from "@/lib/format";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const tanggal = url.searchParams.get("date") ?? todayWIB();
  return NextResponse.json({ queue: getKasirQueue(tanggal) });
}
