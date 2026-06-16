import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  return NextResponse.json({ user });
}
