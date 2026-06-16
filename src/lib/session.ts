import { getIronSession } from "iron-session";
import { findUserById } from "@/lib/db/users";
import { requestContext } from "@/lib/request-context";
import type { SessionData } from "@/lib/request-context";

export type { SessionData } from "@/lib/request-context";
export { runWithUser } from "@/lib/request-context";

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
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

/** Server-side current user, or null if not logged in / session is stale. */
export async function currentUser(): Promise<SessionData | null> {
  const ctx = requestContext.getStore();
  const session = ctx !== undefined ? ctx : await getSession();
  if (!session || !session.userId || !session.role) return null;
  // Guard against stale sessions: the reference may point at a user that no
  // longer exists or was deactivated.
  const user = findUserById(session.userId);
  if (!user || !user.aktif) return null;
  return {
    userId: session.userId,
    username: session.username,
    nama: session.nama,
    role: session.role,
  };
}
