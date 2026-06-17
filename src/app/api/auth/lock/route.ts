import { NextResponse } from "next/server";
import { currentUser, setLocked } from "@/lib/session";

/** Persist the desktop lock-screen gate so a quit reopens straight to the lock. */
export async function POST(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  setLocked(true);
  return NextResponse.json({ ok: true });
}
