"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  /** Minute step for the options list. */
  minuteStep?: number;
  className?: string;
  error?: boolean;
}

const PANEL_W = 168;
const PANEL_H = 240;
const pad = (n: number): string => String(n).padStart(2, "0");

export function TimePicker({ value, onChange, minuteStep = 5, className, error }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [hh = "", mm = ""] = /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));

  const place = (): void => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const top = below < PANEL_H + 12 ? Math.max(8, r.top - PANEL_H - 6) : r.bottom + 6;
    const left = Math.min(window.innerWidth - PANEL_W - 8, Math.max(8, r.left));
    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      const n = e.target;
      if (n instanceof Node && !triggerRef.current?.contains(n) && !panelRef.current?.contains(n)) {
        setOpen(false);
      }
    };
    const onMove = (): void => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const pickHour = (h: string): void => onChange(`${h}:${mm || "00"}`);
  const pickMinute = (m: string): void => {
    onChange(`${hh || "08"}:${m}`);
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-24 items-center justify-between rounded-lg border bg-white px-2.5 text-sm tabular transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30",
          error ? "border-red-400" : "border-slate-300 hover:border-slate-400 focus:border-brand-600",
          value ? "text-slate-800" : "text-slate-400",
        )}
      >
        {value || "--:--"}
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_W, height: PANEL_H }}
              className="z-70 flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              <Column items={hours} selected={hh} onPick={pickHour} label="Jam" />
              <div className="w-px bg-slate-100" />
              <Column items={minutes} selected={mm} onPick={pickMinute} label="Menit" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function Column({
  items,
  selected,
  onPick,
  label,
}: {
  items: string[];
  selected: string;
  onPick: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-slate-100 py-1.5 text-center text-[11px] font-medium text-slate-400">
        {label}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            onClick={() => onPick(it)}
            className={cn(
              "block w-full px-2 py-1.5 text-center text-sm tabular transition-colors",
              it === selected
                ? "bg-brand-600 font-semibold text-white"
                : "text-slate-700 hover:bg-slate-100",
            )}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}
