import { NextResponse } from "next/server";
import { getBillById, payBill } from "@/lib/db/billing";
import { currentUser } from "@/lib/session";
import type { MetodeBayar } from "@/types";

const METODE: ReadonlyArray<MetodeBayar> = ["tunai", "transfer", "qris"];

function parse(data: unknown): { metode: MetodeBayar; dibayar: number } | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const metode = METODE.find((m) => m === rec.metode);
  if (!metode) return "Metode pembayaran tidak valid.";
  const dibayar = typeof rec.dibayar === "number" ? rec.dibayar : NaN;
  if (!Number.isFinite(dibayar) || dibayar < 0) return "Nominal pembayaran tidak valid.";
  return { metode, dibayar };
}

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

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  // Cash must cover the total; non-cash is treated as exact.
  const effective = parsed.metode === "tunai" ? parsed.dibayar : bill.total;
  if (effective < bill.total) {
    return NextResponse.json({ error: "Nominal pembayaran kurang dari total." }, { status: 400 });
  }

  return NextResponse.json({ bill: payBill(billId, parsed.metode, effective) });
}
