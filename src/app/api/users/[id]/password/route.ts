import { NextResponse } from "next/server";
import { findUserById, setUserPassword } from "@/lib/db/users";
import { currentUser } from "@/lib/session";

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
  if (!findUserById(targetId)) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  const data: unknown = await request.json().catch(() => null);
  const password =
    typeof data === "object" && data !== null && "password" in data && typeof data.password === "string"
      ? data.password
      : "";
  if (password.length < 4) {
    return NextResponse.json({ error: "Password minimal 4 karakter." }, { status: 400 });
  }

  setUserPassword(targetId, password);
  return NextResponse.json({ ok: true });
}
