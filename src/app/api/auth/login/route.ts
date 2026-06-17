import { NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { clearMasterKey, setMasterKey } from "@/lib/db/client";
import { keystoreExists, unlock } from "@/lib/crypto/keystore";
import { establishSession } from "@/lib/session";
import { parseLogin } from "@/lib/validation/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = parseLogin(await request.json().catch(() => null));
  if (typeof body === "string") {
    return NextResponse.json({ error: body }, { status: 400 });
  }

  // On an encrypted DB the key must be set before any query. The keystore unwrap
  // doubles as the password check (Argon2). Plaintext dev/legacy DBs skip this.
  const encrypted = keystoreExists();
  if (encrypted) {
    const masterKey = unlock(body.username, body.password);
    if (!masterKey) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }
    setMasterKey(masterKey);
  }

  const user = await authService.login(body.username, body.password);
  if (!user) {
    if (encrypted) clearMasterKey();
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  await establishSession({
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  });

  return NextResponse.json({ user });
}
