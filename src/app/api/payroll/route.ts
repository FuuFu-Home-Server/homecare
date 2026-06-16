import { NextResponse } from "next/server";
import { listPayroll, markSalaryPaid, unmarkSalaryPaid } from "@/lib/db/payroll";
import { currentUser } from "@/lib/session";
import { monthWIB } from "@/lib/format";

async function requirePerawat(): Promise<{ userId: number } | NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (user.role !== "perawat") {
    return NextResponse.json({ error: "Hanya perawat yang dapat mengelola penggajian." }, { status: 403 });
  }
  return { userId: user.userId };
}

function parseMonth(raw: string | null): string {
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : monthWIB();
}

export async function GET(request: Request): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;
  const bulan = parseMonth(new URL(request.url).searchParams.get("month"));
  return NextResponse.json({ month: bulan, rows: listPayroll(bulan) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;

  const data: unknown = await request.json().catch(() => null);
  if (typeof data !== "object" || data === null) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const userId = typeof rec.userId === "number" ? rec.userId : Number(rec.userId);
  const bulan = parseMonth(typeof rec.bulan === "string" ? rec.bulan : null);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Staf tidak valid." }, { status: 400 });
  }
  try {
    markSalaryPaid(userId, bulan, guard.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal." }, { status: 400 });
  }
  return NextResponse.json({ month: bulan, rows: listPayroll(bulan) });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const guard = await requirePerawat();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("userId"));
  const bulan = parseMonth(url.searchParams.get("month"));
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Staf tidak valid." }, { status: 400 });
  }
  unmarkSalaryPaid(userId, bulan);
  return NextResponse.json({ month: bulan, rows: listPayroll(bulan) });
}
