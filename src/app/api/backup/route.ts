import { NextResponse } from "next/server";
import { createBackup, lastBackup, listBackups } from "@/lib/db/backup";
import { currentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  return NextResponse.json({ backups: listBackups(), last: lastBackup() });
}

export async function POST(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  try {
    return NextResponse.json({ backup: createBackup() }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membuat cadangan." },
      { status: 500 },
    );
  }
}
