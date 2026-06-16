import { NextResponse } from "next/server";
import { getClinic, updateClinic } from "@/lib/db/settings";
import { currentUser } from "@/lib/session";
import type { ClinicConfig } from "@/lib/config";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ clinic: getClinic() });
}

function parse(data: unknown): ClinicConfig | string {
  if (typeof data !== "object" || data === null) return "Data tidak valid.";
  const rec: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const get = (f: string): string | null => {
    const v = rec[f];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const nama = get("nama");
  const penanggungJawab = get("penanggungJawab");
  const sipp = get("sipp");
  const alamat = get("alamat");
  const kota = get("kota");
  const telepon = get("telepon");
  if (!nama || !penanggungJawab || !sipp || !alamat || !kota || !telepon) {
    return "Semua field profil praktik wajib diisi.";
  }
  const opt = (f: string): string => {
    const v = rec[f];
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    nama,
    penanggungJawab,
    sipp,
    alamat,
    kota,
    telepon,
    appTitle: opt("appTitle"),
    strukFooter: opt("strukFooter"),
    strukFooter2: opt("strukFooter2"),
  };
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ clinic: updateClinic(parsed) });
}
