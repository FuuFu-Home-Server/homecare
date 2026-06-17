import { NextResponse } from "next/server";
import { findUserByUsername, setUserPassword } from "@/lib/db/users";
import { clearMasterKey, setMasterKey } from "@/lib/db/client";
import { keystoreExists, putUser, unlockWithRecovery } from "@/lib/crypto/keystore";
import { parseRecover } from "@/lib/validation/auth";

/**
 * "Lupa password?" — unlock the DB with the one-time recovery key, then reset
 * the named account's password and re-wrap its keystore entry. The user logs in
 * normally afterwards.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!keystoreExists()) {
    return NextResponse.json({ error: "Pemulihan tidak tersedia." }, { status: 400 });
  }

  const parsed = parseRecover(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const masterKey = unlockWithRecovery(parsed.recoveryKey);
  if (!masterKey) {
    return NextResponse.json({ error: "Kunci pemulihan salah." }, { status: 401 });
  }
  setMasterKey(masterKey);

  const user = findUserByUsername(parsed.username);
  if (!user) {
    clearMasterKey();
    return NextResponse.json({ error: "Username tidak ditemukan." }, { status: 404 });
  }

  setUserPassword(user.id, parsed.password);
  putUser(masterKey, user.username, parsed.password);
  clearMasterKey();

  return NextResponse.json({ ok: true });
}
