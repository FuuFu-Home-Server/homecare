import { NextResponse } from "next/server";
import { createMedicine, listMedicinesWithStock } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";
import type { BentukObat, CreateMedicineInput } from "@/types";

const BENTUK: ReadonlyArray<BentukObat> = ["tablet", "sirup", "injeksi", "kapsul", "salep", "tetes"];

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ medicines: listMedicinesWithStock() });
}

function parse(data: unknown): CreateMedicineInput | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const nama = typeof rec.nama === "string" ? rec.nama.trim() : "";
  if (!nama) return "Nama obat wajib diisi.";
  const satuan = typeof rec.satuan === "string" ? rec.satuan.trim() : "";
  if (!satuan) return "Satuan wajib diisi.";
  const bentuk = BENTUK.find((b) => b === rec.bentuk);
  if (!bentuk) return "Bentuk obat tidak valid.";
  const hargaJual = typeof rec.hargaJual === "number" ? rec.hargaJual : Number(rec.hargaJual);
  if (!Number.isFinite(hargaJual) || hargaJual < 0) return "Harga jual tidak valid.";
  return {
    nama,
    merek: typeof rec.merek === "string" && rec.merek.trim() !== "" ? rec.merek.trim() : null,
    bentuk,
    satuan,
    hargaJual: Math.round(hargaJual),
    obatKeras: rec.obatKeras === true,
    isConsumable: rec.isConsumable === true,
    supplier: typeof rec.supplier === "string" && rec.supplier.trim() !== "" ? rec.supplier.trim() : null,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ medicine: createMedicine(parsed) }, { status: 201 });
}
