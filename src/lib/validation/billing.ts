import { z } from "zod";
import { numLike, parse } from "@/lib/validation/common";
import type { MetodeBayar } from "@/types";

const diskonSchema = z.object({
  diskon: numLike(z.number().min(0, "Diskon tidak valid.")),
});

export function parseDiskon(data: unknown): { diskon: number } | string {
  return parse(diskonSchema, data);
}

const billItemSchema = z.object({
  treatmentId: numLike(z.number().int("Tindakan tidak valid.")),
});

export function parseBillItem(data: unknown): { treatmentId: number } | string {
  return parse(billItemSchema, data);
}

const paySchema = z.object({
  metode: z.enum(["tunai", "transfer", "qris"], { error: "Metode pembayaran tidak valid." }),
  dibayar: numLike(z.number().min(0, "Nominal pembayaran tidak valid.")),
});

export function parsePay(data: unknown): { metode: MetodeBayar; dibayar: number } | string {
  return parse(paySchema, data);
}
