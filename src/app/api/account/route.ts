import { NextResponse } from "next/server";
import { findUserById, setUserPassword, updateUserProfile, verifyUserPassword } from "@/lib/db/users";
import { currentUser, establishSession } from "@/lib/session";
import { parseAccount } from "@/lib/validation/auth";

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined || user.role === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const parsed = parseAccount(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  updateUserProfile(user.userId, parsed.nama);

  if (parsed.password) {
    if (!verifyUserPassword(user.userId, parsed.oldPassword ?? "")) {
      return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
    }
    setUserPassword(user.userId, parsed.password);
  }

  // Keep the session display name in sync (transport-agnostic).
  await establishSession({
    userId: user.userId,
    username: user.username,
    nama: parsed.nama,
    role: user.role,
  });

  return NextResponse.json({ user: findUserById(user.userId) });
}
