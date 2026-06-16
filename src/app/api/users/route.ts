import { NextResponse } from "next/server";
import { createUser, isUsernameTaken, listUsers } from "@/lib/db/users";
import { currentUser } from "@/lib/session";
import type { CreateUserInput, Role } from "@/types";

const ROLES: ReadonlyArray<Role> = ["asisten", "perawat"];

async function requirePerawat(): Promise<{ ok: true } | NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (user.role !== "perawat") {
    return NextResponse.json({ error: "Hanya perawat yang dapat mengelola staf." }, { status: 403 });
  }
  return { ok: true };
}

export async function GET(): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({ users: listUsers() });
}

function parse(data: unknown): CreateUserInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const username = typeof rec.username === "string" ? rec.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9_.]{3,}$/.test(username)) return "Username minimal 3 karakter (huruf/angka).";
  const nama = typeof rec.nama === "string" ? rec.nama.trim() : "";
  if (!nama) return "Nama wajib diisi.";
  const password = typeof rec.password === "string" ? rec.password : "";
  if (password.length < 4) return "Password minimal 4 karakter.";
  const role = ROLES.find((r) => r === rec.role) ?? "asisten";
  const opt = (f: string): string | null => {
    const v = rec[f];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  return {
    username,
    nama,
    password,
    role,
    telepon: opt("telepon"),
    info: opt("info"),
    alamat: opt("alamat"),
    tanggalMulai: opt("tanggalMulai"),
    pembayaran: opt("pembayaran"),
    gaji: optNum(rec.gaji),
  };
}

function optNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  if (isUsernameTaken(parsed.username)) {
    return NextResponse.json({ error: "Username sudah dipakai." }, { status: 409 });
  }
  return NextResponse.json({ user: createUser(parsed) }, { status: 201 });
}
