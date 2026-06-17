import { z } from "zod";
import { numLike, optNum, optText, parse, reqText } from "@/lib/validation/common";
import type { AddBatchInput, BentukObat, CreateMedicineInput, PrescriptionInput } from "@/types";

const BENTUK = ["tablet", "sirup", "injeksi", "kapsul", "salep", "tetes"] as const satisfies readonly BentukObat[];

const medicineSchema = z
  .object({
    nama: reqText("Nama obat wajib diisi."),
    satuan: reqText("Satuan wajib diisi."),
    bentuk: z.enum(BENTUK, { error: "Bentuk obat tidak valid." }),
    hargaJual: numLike(z.number().min(0, "Harga jual tidak valid.")),
    merek: optText,
    supplier: optText,
    obatKeras: z.boolean().catch(false),
    isConsumable: z.boolean().catch(false),
  })
  .transform(
    (o): CreateMedicineInput => ({
      nama: o.nama,
      merek: o.merek,
      bentuk: o.bentuk,
      satuan: o.satuan,
      hargaJual: Math.round(o.hargaJual),
      obatKeras: o.obatKeras,
      isConsumable: o.isConsumable,
      supplier: o.supplier,
    }),
  );

export function parseMedicine(data: unknown): CreateMedicineInput | string {
  return parse(medicineSchema, data);
}

const batchSchema = z.object({
  noBatch: reqText("Nomor batch wajib diisi."),
  tglKadaluarsa: reqText("Tanggal kadaluarsa wajib diisi."),
  qty: numLike(z.number().int("Jumlah harus lebih dari 0.").positive("Jumlah harus lebih dari 0.")),
  hargaBeli: optNum,
});

export function parseBatch(data: unknown): AddBatchInput | string {
  return parse(batchSchema, data);
}

const adjustSchema = z.object({
  delta: numLike(
    z
      .number()
      .int("Jumlah penyesuaian tidak valid.")
      .refine((n) => n !== 0, "Jumlah penyesuaian tidak valid."),
  ),
  alasan: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "Penyesuaian stok"),
    z.string(),
  ),
});

export function parseAdjust(data: unknown): { delta: number; alasan: string } | string {
  return parse(adjustSchema, data);
}

const prescriptionItem = z.object({
  medicineId: numLike(z.number().int("Obat tidak valid.")),
  qty: numLike(z.number().positive("Jumlah obat harus lebih dari 0.")),
  aturanPakai: optText,
});

const dispenseSchema = z
  .object({ items: z.array(prescriptionItem).min(1, "Daftar obat kosong.") })
  .transform((o): PrescriptionInput[] => o.items);

export function parseDispense(data: unknown): PrescriptionInput[] | string {
  return parse(dispenseSchema, data);
}
