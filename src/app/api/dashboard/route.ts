import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/db/dashboard";
import { currentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  return NextResponse.json({ data: getDashboardData() });
}
