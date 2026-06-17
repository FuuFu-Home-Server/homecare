import { NextResponse } from "next/server";
import { countUsers, createUser, isUsernameTaken } from "@/lib/db/users";
import { updateClinic } from "@/lib/db/settings";
import { encryptDatabase, setMasterKey } from "@/lib/db/client";
import { initKeystore, keystoreExists } from "@/lib/crypto/keystore";
import { establishSession } from "@/lib/session";
import { parseSetup } from "@/lib/validation/setup";
import { CONFIG } from "@/lib/config";

/** First-run only: create the owner (perawat) account + clinic identity. */
export async function POST(request: Request): Promise<NextResponse> {
  if (keystoreExists() || countUsers() > 0) {
    return NextResponse.json({ error: "Aplikasi sudah dikonfigurasi." }, { status: 403 });
  }

  const parsed = parseSetup(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  if (isUsernameTaken(parsed.username)) {
    return NextResponse.json({ error: "Username sudah dipakai." }, { status: 409 });
  }

  updateClinic({
    ...parsed.clinic,
    appTitle: CONFIG.clinic.appTitle,
    strukFooter: CONFIG.clinic.strukFooter,
    strukFooter2: "",
  });

  const user = createUser({
    username: parsed.username,
    nama: parsed.nama,
    password: parsed.password,
    role: "perawat",
    telepon: null,
    info: null,
    alamat: null,
    tanggalMulai: null,
    pembayaran: null,
    gaji: null,
  });

  // Encrypt the freshly-populated DB at rest. The keystore wraps a random master
  // key with the owner's password (Argon2) and a one-time recovery key. After
  // this point every connection must hold the key.
  const { masterKey, recoveryKey } = initKeystore(user.username, parsed.password);
  encryptDatabase(masterKey);
  setMasterKey(masterKey);

  await establishSession({
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  });

  return NextResponse.json({ user, recoveryKey }, { status: 201 });
}
