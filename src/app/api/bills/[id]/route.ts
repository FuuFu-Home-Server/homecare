import { NextResponse } from "next/server";
import { getBillById, getBillItems, setDiskon } from "@/lib/db/billing";
import { getVisit } from "@/lib/db/queue";
import { getPatient } from "@/lib/db/patients";
import { currentUser } from "@/lib/session";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const bill = getBillById(Number(id));
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  const visit = getVisit(bill.visitId);
  const patient = visit ? getPatient(visit.patientId) : null;
  if (!visit || !patient) {
    return NextResponse.json({ error: "Data kunjungan tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ bill, items: getBillItems(bill.id), visit, patient });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const billId = Number(id);
  const bill = getBillById(billId);
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  if (bill.status === "lunas") {
    return NextResponse.json({ error: "Tagihan sudah lunas." }, { status: 409 });
  }

  const data: unknown = await request.json().catch(() => null);
  if (typeof data !== "object" || data === null || !("diskon" in data)) {
    return NextResponse.json({ error: "Diskon tidak valid." }, { status: 400 });
  }
  const { diskon } = data;
  if (typeof diskon !== "number" || diskon < 0) {
    return NextResponse.json({ error: "Diskon tidak valid." }, { status: 400 });
  }

  setDiskon(billId, Math.round(diskon));
  const updated = getBillById(billId);
  return NextResponse.json({ bill: updated, items: getBillItems(billId) });
}
