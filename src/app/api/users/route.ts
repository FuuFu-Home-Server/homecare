import { NextResponse } from "next/server";
import { createUser, isUsernameTaken, listUsers } from "@/lib/db/users";
import { currentUser } from "@/lib/session";
import { parseCreateUser } from "@/lib/validation/user";

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

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;

  const parsed = parseCreateUser(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  if (isUsernameTaken(parsed.username)) {
    return NextResponse.json({ error: "Username sudah dipakai." }, { status: 409 });
  }
  return NextResponse.json({ user: createUser(parsed) }, { status: 201 });
}
