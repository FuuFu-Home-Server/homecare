"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
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
  const clinic = useClinic();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
                  logout();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50",
                )}
              >
                <IconLogout className="h-4 w-4" /> Keluar
              </button>
            </div>
        ) : null}
      </div>
    </header>
  );
}
