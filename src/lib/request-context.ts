import { AsyncLocalStorage } from "node:async_hooks";
import type { Role } from "@/types";

export interface SessionData {
  userId?: number;
  username?: string;
  nama?: string;
  role?: Role;
}

/**
 * Transport-agnostic request context. Lives in its own module (no DB import) so
 * the Electron main process can pull in `runWithUser` without eagerly loading
 * better-sqlite3 at startup. The IPC dispatcher seeds this with the logged-in
 * user before invoking a route handler; `currentUser` (in session.ts) reads it,
 * falling back to the iron-session cookie on the web path.
 */
export const requestContext = new AsyncLocalStorage<SessionData | null>();

export function runWithUser<T>(user: SessionData | null, fn: () => T): T {
  return requestContext.run(user, fn);
}
