import { NextResponse } from "next/server";
import { countUsers } from "@/lib/db/users";
import { keystoreExists } from "@/lib/crypto/keystore";

/** Public: tells the renderer whether to show the first-run wizard. Once a
 * keystore exists the DB is encrypted/locked — never read it here; its presence
 * alone means setup is done. Plaintext dev/legacy DBs fall back to a user count. */
export async function GET(): Promise<NextResponse> {
  if (keystoreExists()) return NextResponse.json({ needsSetup: false });
  return NextResponse.json({ needsSetup: countUsers() === 0 });
}
