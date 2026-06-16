import { NextResponse } from "next/server";
import { findUserById, setUserPassword, updateUserProfile, verifyUserPassword } from "@/lib/db/users";
import { currentUser, getSession } from "@/lib/session";

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const data: unknown = await request.json().catch(() => null);
  if (typeof data !== "object" || data === null) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));

  const nama = typeof rec.nama === "string" ? rec.nama.trim() : "";
  if (!nama) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });

  updateUserProfile(user.userId, nama);

  if (typeof rec.password === "string" && rec.password !== "") {
    const oldPassword = typeof rec.oldPassword === "string" ? rec.oldPassword : "";
    if (!oldPassword) {
      return NextResponse.json({ error: "Masukkan password lama." }, { status: 400 });
    }
    if (!verifyUserPassword(user.userId, oldPassword)) {
      return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
    }
    if (rec.password.length < 4) {
      return NextResponse.json({ error: "Password baru minimal 4 karakter." }, { status: 400 });
    }
    setUserPassword(user.userId, rec.password);
  }

  // Keep the session display name in sync.
  const session = await getSession();
  session.nama = nama;
  await session.save();

  return NextResponse.json({ user: findUserById(user.userId) });
}
