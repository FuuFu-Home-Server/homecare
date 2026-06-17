import { z } from "zod";
import { parse, reqText } from "@/lib/validation/common";

const setupSchema = z.object({
  username: z
    .string({ error: "Username minimal 3 karakter (huruf/angka)." })
    .trim()
    .transform((s) => s.toLowerCase())
    .refine((s) => /^[a-z0-9_.]{3,}$/.test(s), "Username minimal 3 karakter (huruf/angka)."),
  nama: reqText("Nama lengkap wajib diisi."),
  password: z.string({ error: "Password minimal 4 karakter." }).min(4, "Password minimal 4 karakter."),
  clinic: z.object({
    nama: reqText("Nama praktik wajib diisi."),
    penanggungJawab: reqText("Penanggung jawab wajib diisi."),
    sipp: reqText("SIPP wajib diisi."),
    alamat: reqText("Alamat wajib diisi."),
    kota: reqText("Kota wajib diisi."),
    telepon: reqText("Telepon wajib diisi."),
  }),
});

export type SetupInput = z.infer<typeof setupSchema>;

export function parseSetup(data: unknown): SetupInput | string {
  return parse(setupSchema, data);
}
