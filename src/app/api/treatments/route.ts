import { NextResponse } from "next/server";
import { listTreatments } from "@/lib/db/billing";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ treatments: listTreatments() });
}
