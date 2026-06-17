import { z } from "zod";
import { optNum, optText, parse, reqText } from "@/lib/validation/common";
import type { CreateUserInput, UpdateUserInput } from "@/types";

const role = z.enum(["asisten", "perawat"]).catch("asisten");

const username = z
  .string({ error: "Username minimal 3 karakter (huruf/angka)." })
  .trim()
  .transform((s) => s.toLowerCase())
  .refine((s) => /^[a-z0-9_.]{3,}$/.test(s), "Username minimal 3 karakter (huruf/angka).");

const baseUser = {
  nama: reqText("Nama wajib diisi."),
  role,
  telepon: optText,
  info: optText,
  alamat: optText,
  tanggalMulai: optText,
  pembayaran: optText,
  gaji: optNum,
};

const createUserSchema = z.object({
  ...baseUser,
  username,
  password: z.string({ error: "Password minimal 4 karakter." }).min(4, "Password minimal 4 karakter."),
});

const updateUserSchema = z.object(baseUser);

export function parseCreateUser(data: unknown): CreateUserInput | string {
  return parse(createUserSchema, data);
}

export function parseUpdateUser(data: unknown): UpdateUserInput | string {
  return parse(updateUserSchema, data);
}
