import type { SessionData } from "@/lib/request-context";

/**
 * The desktop session lives in the main process for the lifetime of the unlocked
 * app — there are no HTTP cookies. Set on successful login, cleared on logout /
 * lock. The IPC dispatcher reads `current` and seeds the request context so route
 * handlers see the logged-in user.
 */
let current: SessionData | null = null;

export function getCurrentSession(): SessionData | null {
  return current;
}

export function setCurrentSession(session: SessionData | null): void {
  current = session;
}

export function clearCurrentSession(): void {
  current = null;
}
