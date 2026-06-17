import { AsyncLocalStorage } from "node:async_hooks";
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
 */
interface SharedState {
  als: AsyncLocalStorage<SessionData | null>;
  desktop: boolean;
  current: SessionData | null;
}

const globalRef = globalThis as typeof globalThis & { __homecareState?: SharedState };

const state: SharedState =
  globalRef.__homecareState ??
  (globalRef.__homecareState = {
    als: new AsyncLocalStorage<SessionData | null>(),
    desktop: false,
    current: null,
  });

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
}

export function getCurrentSession(): SessionData | null {
  return state.current;
}
