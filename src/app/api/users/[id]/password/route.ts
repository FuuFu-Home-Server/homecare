import { NextResponse } from "next/server";
import { findUserById, setUserPassword } from "@/lib/db/users";
import { getMasterKey } from "@/lib/db/client";
import { keystoreExists, putUser } from "@/lib/crypto/keystore";
import { currentUser } from "@/lib/session";
import { parsePassword } from "@/lib/validation/auth";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (user.role !== "perawat") {
    return NextResponse.json({ error: "Hanya perawat yang dapat mengelola staf." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const targetId = Number(id);
  const target = findUserById(targetId);
  if (!target) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  const parsed = parsePassword(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  setUserPassword(targetId, parsed.password);

  // Re-wrap the target's keystore entry under the new password — otherwise the
  // DB hash changes but their wrapped key does not, locking them out of the DB.
  const masterKey = getMasterKey();
  if (keystoreExists() && masterKey) putUser(masterKey, target.username, parsed.password);

  return NextResponse.json({ ok: true });
}
