import { NextResponse } from "next/server";
import { createMedicine, listMedicinesWithStock } from "@/lib/db/inventory";
import { currentUser } from "@/lib/session";
import { parseMedicine } from "@/lib/validation/inventory";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ medicines: listMedicinesWithStock() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const parsed = parseMedicine(await request.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  return NextResponse.json({ medicine: createMedicine(parsed) }, { status: 201 });
}
