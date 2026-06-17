import { NextResponse } from "next/server";
import { deleteUser, findUserById, setUserActive, updateUser } from "@/lib/db/users";
import { keystoreExists, removeUser } from "@/lib/crypto/keystore";
import { currentUser } from "@/lib/session";
import type { Role } from "@/types";

const ROLES: ReadonlyArray<Role> = ["asisten", "perawat"];

export async function PATCH(
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
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

  const data: unknown = await request.json().catch(() => null);
  if (typeof data !== "object" || data === null) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));

  if (typeof rec.nama === "string" && rec.nama.trim() !== "") {
    const opt = (f: string): string | null => {
      const v = rec[f];
      return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
    };
    const gajiRaw =
      typeof rec.gaji === "number"
        ? rec.gaji
        : typeof rec.gaji === "string" && rec.gaji.trim() !== ""
          ? Number(rec.gaji)
          : NaN;
    updateUser(targetId, {
      nama: rec.nama.trim(),
      role: ROLES.find((r) => r === rec.role) ?? target.role,
      telepon: opt("telepon"),
      info: opt("info"),
      alamat: opt("alamat"),
      tanggalMulai: opt("tanggalMulai"),
      pembayaran: opt("pembayaran"),
      gaji: Number.isFinite(gajiRaw) && gajiRaw >= 0 ? Math.round(gajiRaw) : null,
    });
  }
  if (typeof rec.aktif === "boolean") {
    if (targetId === user.userId && !rec.aktif) {
      return NextResponse.json({ error: "Tidak bisa menonaktifkan akun sendiri." }, { status: 400 });
    }
    setUserActive(targetId, rec.aktif);
  }
  return NextResponse.json({ user: findUserById(targetId) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (user.role !== "perawat") {
    return NextResponse.json({ error: "Hanya perawat yang dapat mengelola staf." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const targetId = Number(id);
  if (targetId === user.userId) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri." }, { status: 400 });
  }
  const target = findUserById(targetId);
  if (!target) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }
  deleteUser(targetId);
  if (keystoreExists()) removeUser(target.username);
  return NextResponse.json({ ok: true });
}
