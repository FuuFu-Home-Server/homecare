import { NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { getSession } from "@/lib/session";

interface LoginBody {
  username: string;
  password: string;
}

function parseBody(data: unknown): LoginBody | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("username" in data) || !("password" in data)) return null;
  const { username, password } = data;
  if (typeof username !== "string" || typeof password !== "string") return null;
  return { username, password };
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const user = await authService.login(body.username, body.password);
  if (!user) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.nama = user.nama;
  session.role = user.role;
  await session.save();

  return NextResponse.json({ user });
}
