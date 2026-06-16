import { NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { getSession } from "@/lib/session";
import type { Role } from "@/types";

const ROLES: ReadonlyArray<Role> = ["asisten", "perawat"];

function parseRole(data: unknown): Role | null {
  if (typeof data !== "object" || data === null || !("role" in data)) return null;
  const { role } = data;
  return ROLES.find((r) => r === role) ?? null;
}

// DEMO STUB: instant role switch to showcase the Asisten ↔ Perawat handoff.
export async function POST(request: Request): Promise<NextResponse> {
  const role = parseRole(await request.json().catch(() => null));
  if (!role) {
    return NextResponse.json({ error: "Peran tidak valid." }, { status: 400 });
  }

  const user = await authService.switchToRole(role);
  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.nama = user.nama;
  session.role = user.role;
  await session.save();

  return NextResponse.json({ user });
}
