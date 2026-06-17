"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CONFIG } from "@/lib/config";
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
export function LockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (locked) return;
    const ms = CONFIG.security.idleLockMinutes * 60_000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => setLocked(true), ms);
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
  }, [locked]);

  return (
    <LockContext.Provider value={{ lock: () => setLocked(true) }}>
      {children}
      {locked ? <LockScreen nama={user.nama} onUnlock={() => setLocked(false)} /> : null}
    </LockContext.Provider>
  );
}
