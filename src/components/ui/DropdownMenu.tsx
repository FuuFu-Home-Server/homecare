"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface DropdownMenuProps {
  items: MenuItem[];
  align?: "left" | "right";
  label?: string;
}

const MENU_WIDTH = 176; // w-44

interface Coords {
  top: number;
  left: number;
}

/**
 * Kebab-triggered action menu. The menu is rendered in a portal on document.body
 * with fixed positioning, so it is never clipped by an ancestor's `overflow`
 * (e.g. a table's rounded container) — including on the last row. It flips above
 * the trigger when there isn't room below.
 */
export function DropdownMenu({ items, align = "right", label = "Aksi" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = (): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = items.length * 40 + 16;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight + 12 ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left =
      align === "right"
        ? Math.max(8, rect.right - MENU_WIDTH)
        : Math.min(window.innerWidth - MENU_WIDTH - 8, rect.left);
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent): void => {
      const t = e.target;
      if (t instanceof Node && !triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onMove = (): void => setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
              className="z-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40",
                    item.tone === "danger"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {item.icon ? <span className="h-4 w-4 shrink-0">{item.icon}</span> : null}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
