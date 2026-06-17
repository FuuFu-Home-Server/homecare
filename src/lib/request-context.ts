import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import type { Role } from "@/types";

export interface SessionData {
  userId?: number;
  username?: string;
  nama?: string;
  role?: Role;
}

/**
 * Process-wide request/session state, db-free so the Electron main process can
 * pull it in without eagerly loading better-sqlite3.
 *
 * The state is pinned on globalThis because main.js and the lazily-loaded route
 * chunk are separate esbuild bundles — each carries its own copy of this module.
 * Sharing through globalThis makes them point at the SAME AsyncLocalStorage and
 * session holder, so a user seeded by the dispatcher (main) is visible to
 * `currentUser` running inside a route handler (chunk).
 *
 *  - als      : per-call user context; the dispatcher seeds it before invoking.
 *  - desktop  : true under Electron; flips session reads/writes off the cookie.
 *  - current  : the logged-in desktop session (no HTTP cookie to persist it).
 *  - locked   : desktop lock-screen gate; survives restart via the session file.
 */
interface SharedState {
  als: AsyncLocalStorage<SessionData | null>;
  desktop: boolean;
  current: SessionData | null;
  locked: boolean;
}

const globalRef = globalThis as typeof globalThis & { __homecareState?: SharedState };

const state: SharedState =
  globalRef.__homecareState ??
  (globalRef.__homecareState = {
    als: new AsyncLocalStorage<SessionData | null>(),
    desktop: false,
    current: null,
    locked: false,
  });

interface PersistedSession {
  data: SessionData | null;
  locked: boolean;
}

// Set by the Electron main process (packaged) so the desktop session survives a
// quit. Absent in dev (the next-dev server uses the iron-session cookie instead).
function sessionFile(): string | undefined {
  return process.env.HOMECARE_SESSION_PATH;
}

function persist(): void {
  const file = sessionFile();
  if (!file) return;
  const snapshot: PersistedSession = { data: state.current, locked: state.locked };
  try {
    fs.writeFileSync(file, JSON.stringify(snapshot), "utf-8");
  } catch {
    /* non-fatal: session is a convenience, re-login always recovers */
  }
}

/** Rehydrate the desktop session + lock flag from disk. Call once on main boot. */
export function restorePersistedSession(): void {
  const file = sessionFile();
  if (!file) return;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<PersistedSession>;
    state.current = raw.data ?? null;
    state.locked = raw.locked === true;
  } catch {
    state.current = null;
    state.locked = false;
  }
}

export function runWithUser<T>(user: SessionData | null, fn: () => T): T {
  return state.als.run(user, fn);
}

export function getStoredUser(): SessionData | null | undefined {
  return state.als.getStore();
}

export function enableDesktopMode(): void {
  state.desktop = true;
}

export function isDesktop(): boolean {
  return state.desktop;
}

export function setCurrentSession(session: SessionData | null): void {
  state.current = session;
  if (session === null) state.locked = false;
  persist();
}

export function getCurrentSession(): SessionData | null {
  return state.current;
}

export function setLocked(value: boolean): void {
  state.locked = value;
  persist();
}

export function isLocked(): boolean {
  return state.locked;
}
