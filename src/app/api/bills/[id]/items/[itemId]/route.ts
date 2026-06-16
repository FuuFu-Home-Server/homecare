import { NextResponse } from "next/server";
import { getBillById, getBillItems, removeBillItem } from "@/lib/db/billing";
import { currentUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id, itemId } = await ctx.params;
  const billId = Number(id);
  const bill = getBillById(billId);
  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  if (bill.status === "lunas") {
    return NextResponse.json({ error: "Tagihan sudah lunas." }, { status: 409 });
  }

  try {
    removeBillItem(Number(itemId));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menghapus item." },
      { status: 400 },
    );
  }
  return NextResponse.json({ items: getBillItems(billId), bill: getBillById(billId) });
}
