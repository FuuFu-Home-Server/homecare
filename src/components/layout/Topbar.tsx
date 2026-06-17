"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { postJson } from "@/lib/fetcher";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { useLock } from "@/hooks/useLock";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconLogout, IconMenu } from "@/components/layout/icons";
import type { Role } from "@/types";

export interface TopbarProps {
  onOpenMenu: () => void;
}

const ROLE_LABEL: Record<Role, string> = {
  asisten: "Asisten",
  perawat: "Perawat",
};

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const { lock } = useLock();
  const clinic = useClinic();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [confirm, setConfirm] = useState<"logout" | "quit" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDesktop(typeof window !== "undefined" && Boolean(window.homecare));
  }, []);

  // Persist the lock, then quit — re-opening lands on the lock screen, session intact.
  async function quitApp(): Promise<void> {
    try {
      await postJson("/api/auth/lock", {});
    } catch {
      /* lock is best-effort; quit anyway */
    }
    await window.homecare?.quit();
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent): void => {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Buka menu"
        >
          <IconMenu />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{clinic.nama}</p>
          <p className="truncate text-xs text-slate-400">{clinic.penanggungJawab}</p>
        </div>
      </div>

      <div ref={menuRef} className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {user.nama.charAt(0)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold text-slate-700">{user.nama}</span>
            <span className="block text-[11px] text-slate-400">{ROLE_LABEL[user.role]}</span>
          </span>
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-12 z-20 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  lock();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>{" "}
                Kunci Layar
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirm("logout");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50",
                )}
              >
                <IconLogout className="h-4 w-4" /> Keluar
              </button>
              {isDesktop ? (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirm("quit");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                      <line x1="12" y1="2" x2="12" y2="12" />
                    </svg>{" "}
                    Keluar Aplikasi
                  </button>
                </>
              ) : null}
            </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirm === "logout"}
        onClose={() => setConfirm(null)}
        onConfirm={logout}
        title="Keluar"
        message="Keluar dari akun ini? Anda harus masuk kembali."
        confirmLabel="Keluar"
      />
      <ConfirmDialog
        open={confirm === "quit"}
        onClose={() => setConfirm(null)}
        onConfirm={quitApp}
        title="Keluar Aplikasi"
        message="Tutup aplikasi? Sesi tersimpan — saat dibuka kembali akan langsung ke layar terkunci."
        confirmLabel="Keluar Aplikasi"
      />
    </header>
  );
}
