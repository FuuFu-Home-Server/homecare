import { NextResponse } from "next/server";
import { verifyUserPassword } from "@/lib/db/users";
import { currentUser, setLocked } from "@/lib/session";
import { parseUnlock } from "@/lib/validation/auth";

/** Re-verify the logged-in user's password to clear the lock screen. */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const parsed = parseUnlock(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  if (!verifyUserPassword(user.userId, parsed.password)) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }
  setLocked(false);
  return NextResponse.json({ ok: true });
}
