import { NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { establishSession } from "@/lib/session";
import { parseLogin } from "@/lib/validation/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = parseLogin(await request.json().catch(() => null));
  if (typeof body === "string") {
    return NextResponse.json({ error: body }, { status: 400 });
  }

  const user = await authService.login(body.username, body.password);
  if (!user) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  await establishSession({
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
  });

  return NextResponse.json({ user });
}
