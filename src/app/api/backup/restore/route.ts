import { NextResponse } from "next/server";
import { restoreBackup } from "@/lib/db/backup";
import { currentUser } from "@/lib/session";
import { parseRestore } from "@/lib/validation/backup";

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parseRestore(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  try {
    restoreBackup(parsed.name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memulihkan cadangan." },
      { status: 500 },
    );
  }
}
