import { z } from "zod";
import { optText, parse, reqText } from "@/lib/validation/common";

const loginSchema = z.object({
  username: z.string({ error: "Username wajib diisi." }).min(1, "Username wajib diisi."),
  password: z.string({ error: "Password wajib diisi." }).min(1, "Password wajib diisi."),
});

export function parseLogin(data: unknown): { username: string; password: string } | string {
  return parse(loginSchema, data);
}

const passwordSchema = z.object({
  password: z.string({ error: "Password minimal 4 karakter." }).min(4, "Password minimal 4 karakter."),
});

export function parsePassword(data: unknown): { password: string } | string {
  return parse(passwordSchema, data);
}

const accountSchema = z
  .object({
    nama: reqText("Nama wajib diisi."),
    oldPassword: optText,
    password: optText,
  })
  .refine((o) => !o.password || Boolean(o.oldPassword), "Masukkan password lama.")
  .refine((o) => !o.password || o.password.length >= 4, "Password baru minimal 4 karakter.");

export function parseAccount(
  data: unknown,
): { nama: string; oldPassword: string | null; password: string | null } | string {
  return parse(accountSchema, data);
}
