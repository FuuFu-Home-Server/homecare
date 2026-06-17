import { NextResponse } from "next/server";
import { getSchedule, updateSchedule } from "@/lib/db/settings";
import { currentUser } from "@/lib/session";
import { parseSchedule } from "@/lib/validation/clinic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ schedule: getSchedule() });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parseSchedule(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ schedule: updateSchedule(parsed) });
}
