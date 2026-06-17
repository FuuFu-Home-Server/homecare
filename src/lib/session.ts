import { getIronSession } from "iron-session";
import { findUserById } from "@/lib/db/users";
import {
  getStoredUser,
  isDesktop,
  setCurrentSession,
} from "@/lib/request-context";
import type { SessionData } from "@/lib/request-context";

export type { SessionData } from "@/lib/request-context";
export { runWithUser, isLocked, setLocked } from "@/lib/request-context";

// DEMO STUB: hardcoded session secret. Production reads from env (>= 32 chars).
const SESSION_PASSWORD =
  process.env.SESSION_SECRET ?? "homecare-demo-session-secret-key-min-32-characters";

export const sessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: "homecare_session",
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

/**
 * Persist a logged-in session. Desktop writes the in-process holder (no cookie);
 * web saves the iron-session cookie. Routes call this seam, never the transport.
 */
export async function establishSession(data: SessionData): Promise<void> {
  if (isDesktop()) {
    setCurrentSession(data);
    return;
  }
  const session = await getSession();
  session.userId = data.userId;
  session.username = data.username;
  session.nama = data.nama;
  session.role = data.role;
  await session.save();
}

/** Tear down the session (logout / lock). */
export async function destroySession(): Promise<void> {
  if (isDesktop()) {
    setCurrentSession(null);
    return;
  }
  const session = await getSession();
  session.destroy();
}

/** Server-side current user, or null if not logged in / session is stale. */
export async function currentUser(): Promise<SessionData | null> {
  const ctx = getStoredUser();
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
