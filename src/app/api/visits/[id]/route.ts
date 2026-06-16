import { NextResponse } from "next/server";
import { getQueueEntry, updateStatus } from "@/lib/db/queue";
import { currentUser } from "@/lib/session";
import type { AntrianStatus } from "@/types";

const STATUSES: ReadonlyArray<AntrianStatus> = ["terdaftar", "tiba", "diperiksa", "selesai", "batal"];

function parseStatus(data: unknown): AntrianStatus | null {
  if (typeof data !== "object" || data === null || !("status" in data)) return null;
  const { status } = data;
  return STATUSES.find((s) => s === status) ?? null;
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { id } = await ctx.params;
  const visitId = Number(id);
  if (!getQueueEntry(visitId)) {
    return NextResponse.json({ error: "Kunjungan tidak ditemukan." }, { status: 404 });
  }
  const status = parseStatus(await request.json().catch(() => null));
  if (!status) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });

  updateStatus(visitId, status);
  return NextResponse.json({ entry: getQueueEntry(visitId) });
}
