import { NextResponse } from "next/server";
import { currentUser, isLocked } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  return NextResponse.json({ user, locked: user ? isLocked() : false });
}
