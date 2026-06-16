import { NextResponse } from "next/server";
import { addTindakan, getBillById, getBillItems } from "@/lib/db/billing";
import { currentUser } from "@/lib/session";

export async function POST(
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
  if (typeof data !== "object" || data === null || !("treatmentId" in data)) {
    return NextResponse.json({ error: "Tindakan tidak valid." }, { status: 400 });
  }
  const { treatmentId } = data;
  if (typeof treatmentId !== "number" || !Number.isInteger(treatmentId)) {
    return NextResponse.json({ error: "Tindakan tidak valid." }, { status: 400 });
  }

  addTindakan(billId, treatmentId);
  return NextResponse.json({ items: getBillItems(billId), bill: getBillById(billId) }, { status: 201 });
}
