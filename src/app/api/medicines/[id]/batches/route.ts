import { NextResponse } from "next/server";
import { addBatch, getMedicineDetail } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";
import type { AddBatchInput } from "@/types";

function parse(data: unknown): AddBatchInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const noBatch = typeof rec.noBatch === "string" ? rec.noBatch.trim() : "";
  if (!noBatch) return "Nomor batch wajib diisi.";
  const tglKadaluarsa = typeof rec.tglKadaluarsa === "string" ? rec.tglKadaluarsa.trim() : "";
  if (!tglKadaluarsa) return "Tanggal kadaluarsa wajib diisi.";
  const qty = typeof rec.qty === "number" ? rec.qty : Number(rec.qty);
  if (!Number.isInteger(qty) || qty <= 0) return "Jumlah harus lebih dari 0.";
  const hargaBeliRaw = rec.hargaBeli;
  const hargaBeli =
    typeof hargaBeliRaw === "number" && Number.isFinite(hargaBeliRaw)
      ? Math.round(hargaBeliRaw)
      : null;
  return { noBatch, tglKadaluarsa, qty, hargaBeli };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user || user.userId === undefined) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const medicineId = Number(id);
  if (!getMedicineDetail(medicineId)) {
    return NextResponse.json({ error: "Obat tidak ditemukan." }, { status: 404 });
  }
  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  addBatch(medicineId, parsed, user.userId);
  return NextResponse.json({ detail: getMedicineDetail(medicineId) }, { status: 201 });
}
