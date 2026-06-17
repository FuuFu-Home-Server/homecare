"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CONFIG } from "@/lib/config";
import { postJson } from "@/lib/fetcher";
import { useAuth } from "@/hooks/useAuth";
import { LockScreen } from "@/components/layout/LockScreen";

interface LockValue {
  /** Lock the screen immediately (manual lock). */
  lock: () => void;
}

const LockContext = createContext<LockValue | null>(null);

export function useLock(): LockValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock harus dipakai di dalam <LockProvider>");
  return ctx;
}

/**
 * Idle auto-lock + manual lock. The lock is a renderer-side UI gate (the session
 * stays valid) — a convenience that keeps patient data off an unattended screen,
 * not a cryptographic boundary. At-rest encryption is the real protection.
 */
export function LockProvider({
  children,
  initialLocked = false,
}: {
  children: ReactNode;
  initialLocked?: boolean;
}) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(initialLocked);

  // Persist the lock so closing the app while locked re-opens to the lock screen.
  const lockNow = useCallback((): void => {
    setLocked(true);
    void postJson("/api/auth/lock", {}).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (locked) return;
    const ms = CONFIG.security.idleLockMinutes * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = (): void => {
      clearTimeout(timer);
      timer = setTimeout(lockNow, ms);
    };
    const events: ReadonlyArray<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [locked, lockNow]);

  return (
    <LockContext.Provider value={{ lock: lockNow }}>
      {children}
      {locked ? <LockScreen nama={user.nama} onUnlock={() => setLocked(false)} /> : null}
    </LockContext.Provider>
  );
}
