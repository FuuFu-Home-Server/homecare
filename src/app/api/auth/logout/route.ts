import { NextResponse } from "next/server";
import { clearMasterKey, hasMasterKey } from "@/lib/db/client";
import { destroySession } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  await destroySession();
  if (hasMasterKey()) clearMasterKey();
  return NextResponse.json({ ok: true });
}
