import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { findUserById } from "@/lib/db/users";
import type { Role } from "@/types";

export interface SessionData {
  userId?: number;
  username?: string;
  nama?: string;
  role?: Role;
}

// DEMO STUB: hardcoded session secret. Production reads from env (>= 32 chars).
const SESSION_PASSWORD =
  process.env.SESSION_SECRET ?? "homedoc-demo-session-secret-key-min-32-characters";

export const sessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: "homedoc_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

/** Server-side current user, or null if not logged in / session is stale. */
export async function currentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId || !session.role) return null;
  // Guard against stale sessions (e.g. after a db:reset reassigns user ids):
  // the cookie may reference a user that no longer exists or was deactivated.
  const user = findUserById(session.userId);
  if (!user || !user.aktif) return null;
  return {
    userId: session.userId,
    username: session.username,
    nama: session.nama,
    role: session.role,
  };
}
