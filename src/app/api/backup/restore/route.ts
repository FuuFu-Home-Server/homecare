import { NextResponse } from "next/server";
import { restoreBackup } from "@/lib/db/backup";
import { currentUser } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const data: unknown = await request.json().catch(() => null);
  const name =
    typeof data === "object" && data !== null && "name" in data && typeof data.name === "string"
      ? data.name
      : null;
  if (!name) return NextResponse.json({ error: "Nama berkas tidak valid." }, { status: 400 });

  try {
    restoreBackup(name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memulihkan cadangan." },
      { status: 500 },
    );
  }
}
