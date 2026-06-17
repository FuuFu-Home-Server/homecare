import { NextResponse } from "next/server";
import { getClinic, updateClinic } from "@/lib/db/settings";
import { currentUser } from "@/lib/session";
import { parseClinic } from "@/lib/validation/clinic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ clinic: getClinic() });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parseClinic(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ clinic: updateClinic(parsed) });
}
