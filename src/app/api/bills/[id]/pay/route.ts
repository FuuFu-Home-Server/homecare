import { NextResponse } from "next/server";
import { getBillById, payBill } from "@/lib/db/billing";
import { currentUser } from "@/lib/session";
import { parsePay } from "@/lib/validation/billing";

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
  if (bill.status === "lunas") return NextResponse.json({ error: "Tagihan sudah lunas." }, { status: 409 });

  const parsed = parsePay(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  // Cash must cover the total; non-cash is treated as exact.
  const effective = parsed.metode === "tunai" ? parsed.dibayar : bill.total;
  if (effective < bill.total) {
    return NextResponse.json({ error: "Nominal pembayaran kurang dari total." }, { status: 400 });
  }

  return NextResponse.json({ bill: payBill(billId, parsed.metode, effective) });
}
