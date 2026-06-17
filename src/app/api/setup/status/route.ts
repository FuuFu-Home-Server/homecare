import { NextResponse } from "next/server";
import { countUsers } from "@/lib/db/users";

/** Public: tells the renderer whether to show the first-run wizard. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ needsSetup: countUsers() === 0 });
}
