import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import {
  clearTransactions,
  deleteAllPatients,
  restoreDefaultSettings,
  factoryReset,
} from "@/lib/db/danger";

const PHRASE: Record<string, string> = {
  "clear-transactions": "HAPUS TRANSAKSI",
  "delete-patients": "HAPUS PASIEN",
  "restore-settings": "RESET PENGATURAN",
  "factory-reset": "RESET TOTAL",
};

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  if (user.role !== "perawat") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    confirm?: string;
  } | null;
  const action = body?.action ?? "";
  const expected = PHRASE[action];
  if (!expected) return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });
  if ((body?.confirm ?? "").trim() !== expected) {
    return NextResponse.json(
      { error: `Ketik "${expected}" untuk konfirmasi.` },
      { status: 400 },
    );
  }

  switch (action) {
    case "clear-transactions":
      clearTransactions();
      break;
    case "delete-patients":
      deleteAllPatients();
      break;
    case "restore-settings":
      restoreDefaultSettings();
      break;
    case "factory-reset":
      factoryReset();
      return NextResponse.json({ ok: true, reset: true });
  }

  return NextResponse.json({ ok: true });
}
