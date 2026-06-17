import { z } from "zod";
import { parse, reqText } from "@/lib/validation/common";

const restoreSchema = z.object({ name: reqText("Nama berkas tidak valid.") });

export function parseRestore(data: unknown): { name: string } | string {
  return parse(restoreSchema, data);
}
