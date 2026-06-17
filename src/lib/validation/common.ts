import { z } from "zod";

/**
 * Run a zod schema and collapse the result into the `T | string` contract the
 * route/IPC layer already uses: the parsed value on success, or the first
 * (Indonesian) error message on failure. Never trust renderer input — every
 * write parses through one of these schemas at the IPC boundary.
 */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> | string {
  const result = schema.safeParse(data);
  return result.success ? result.data : (result.error.issues[0]?.message ?? "Data tidak valid.");
}

/** Optional free text: trims; empty / missing / non-string becomes null. */
export const optText = z.string().trim().min(1).nullable().catch(null);

/** Required free text with a custom message. */
export const reqText = (message: string) => z.string({ error: message }).trim().min(1, message);

/** Optional enum: a value outside the set (or missing) becomes null. */
export const optEnum = <T extends string>(values: readonly [T, ...T[]]) =>
  z.enum(values).nullable().catch(null);

/** Non-negative integer rupiah / quantity with a custom message. */
export const intMin = (min: number, message: string) =>
  z.number({ error: message }).int(message).min(min, message);

/** Optional number: accepts number or numeric string; empty / invalid → null. */
export const optNum = z.preprocess((v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}, z.number().nullable());
