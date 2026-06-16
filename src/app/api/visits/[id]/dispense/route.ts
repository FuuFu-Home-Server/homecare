import { NextResponse } from "next/server";
import { dispensePrescriptions, getPrescriptions } from "@/lib/db/inventory";
import { getVisit } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import type { PrescriptionInput } from "@/types";

function parseItems(data: unknown): PrescriptionInput[] | string {
  if (typeof data !== "object" || data === null || !("items" in data)) return "Daftar obat kosong.";
  const { items } = data;
  if (!Array.isArray(items) || items.length === 0) return "Daftar obat kosong.";

  const out: PrescriptionInput[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) return "Item obat tidak valid.";
    const rec: Record<string, unknown> = Object.fromEntries(Object.entries(raw));
    const medicineId = rec.medicineId;
    const qty = rec.qty;
    if (typeof medicineId !== "number" || !Number.isInteger(medicineId)) return "Obat tidak valid.";
    if (typeof qty !== "number" || qty <= 0) return "Jumlah obat harus lebih dari 0.";
    out.push({
      medicineId,
      qty,
      aturanPakai: typeof rec.aturanPakai === "string" && rec.aturanPakai.trim() !== "" ? rec.aturanPakai.trim() : null,
    });
  }
  return out;
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
  const visitId = Number(id);
  if (!getVisit(visitId)) return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });

  const items = parseItems(await request.json().catch(() => null));
  if (typeof items === "string") return NextResponse.json({ error: items }, { status: 400 });

  const result = dispensePrescriptions(visitId, user.userId, items);
  return NextResponse.json({ ...result, prescriptions: getPrescriptions(visitId) }, { status: 201 });
}
