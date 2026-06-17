"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Input";
import { tglWIB, todayWIB } from "@/lib/format";

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  /** Inclusive bounds as "YYYY-MM-DD". */
  min?: string;
  max?: string;
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const PANEL_W = 288;
const PANEL_H = 340;

const pad = (n: number): string => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;

function parse(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

export function DatePicker({ value, onChange, label, error, hint, placeholder = "Pilih tanggal", min, max }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = parse(value);
  const today = parse(todayWIB());
  const [view, setView] = useState(() => parsed ?? today ?? { y: 2026, m: 0, d: 1 });
  const [mode, setMode] = useState<"days" | "months" | "years">("days");

  // Re-center the calendar on the selected month each time it opens.
  useEffect(() => {
    if (open) {
      setMode("days");
      if (parsed) setView({ y: parsed.y, m: parsed.m, d: parsed.d });
    }
    // Only re-sync when the popover opens.
  }, [open]);

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

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const disabled = (d: number): boolean => {
    const s = iso(view.y, view.m, d);
    return (min !== undefined && s < min) || (max !== undefined && s > max);
  };

  const shiftMonth = (delta: number): void => {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth(), d: 1 });
  };

  const shiftView = (delta: number): void => {
    if (mode === "days") shiftMonth(delta);
    else if (mode === "months") setView((v) => ({ ...v, y: v.y + delta }));
    else setView((v) => ({ ...v, y: v.y + delta * 12 }));
  };

  const minY = min ? Number(min.slice(0, 4)) : -Infinity;
  const maxY = max ? Number(max.slice(0, 4)) : Infinity;
  const yearStart = view.y - ((view.y % 12) + 12) % 12;
  const monthDisabled = (m: number): boolean =>
    (min !== undefined && iso(view.y, m, new Date(view.y, m + 1, 0).getDate()) < min) ||
    (max !== undefined && iso(view.y, m, 1) > max);

  const pick = (d: number): void => {
    onChange(iso(view.y, view.m, d));
    setOpen(false);
  };

  const title =
    mode === "days" ? `${BULAN[view.m]} ${view.y}` : mode === "months" ? `${view.y}` : `${yearStart}–${yearStart + 11}`;

  return (
    <div className="w-full">
      {label ? <Label>{label}</Label> : null}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30",
          error ? "border-red-400" : "border-slate-300 hover:border-slate-400 focus:border-brand-600",
          value ? "text-slate-900" : "text-slate-400",
        )}
      >
        {value ? tglWIB(value) : placeholder}
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: PANEL_W }}
              className="z-70 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "days"))}
                  className="rounded-md px-2 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  {title}
                </button>
                <div className="flex gap-1">
                  <NavBtn label="Sebelumnya" onClick={() => shiftView(-1)}>‹</NavBtn>
                  <NavBtn label="Berikutnya" onClick={() => shiftView(1)}>›</NavBtn>
                </div>
              </div>

              {mode === "days" ? (
                <>
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-400">
                    {HARI.map((h) => (
                      <div key={h} className="py-1">{h}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={`b${i}`} />;
                      const s = iso(view.y, view.m, d);
                      const isSelected = value === s;
                      const isToday = today !== null && iso(today.y, today.m, today.d) === s;
                      const off = disabled(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={off}
                          onClick={() => pick(d)}
                          className={cn(
                            "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                            off && "cursor-not-allowed text-slate-300",
                            !off && isSelected && "bg-brand-600 font-semibold text-white",
                            !off && !isSelected && isToday && "bg-brand-50 font-semibold text-brand-700",
                            !off && !isSelected && !isToday && "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : mode === "months" ? (
                <div className="grid grid-cols-3 gap-1 py-1">
                  {BULAN.map((b, m) => {
                    const off = monthDisabled(m);
                    const isCurrent = view.m === m && parsed?.y === view.y;
                    return (
                      <button
                        key={b}
                        type="button"
                        disabled={off}
                        onClick={() => { setView((v) => ({ ...v, m })); setMode("days"); }}
                        className={cn(
                          "flex h-10 items-center justify-center rounded-md text-sm transition-colors",
                          off && "cursor-not-allowed text-slate-300",
                          !off && isCurrent && "bg-brand-600 font-semibold text-white",
                          !off && !isCurrent && "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {b.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1 py-1">
                  {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => {
                    const off = y < minY || y > maxY;
                    const isCurrent = parsed?.y === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        disabled={off}
                        onClick={() => { setView((v) => ({ ...v, y })); setMode("months"); }}
                        className={cn(
                          "flex h-10 items-center justify-center rounded-md text-sm transition-colors",
                          off && "cursor-not-allowed text-slate-300",
                          !off && isCurrent && "bg-brand-600 font-semibold text-white",
                          !off && !isCurrent && "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => { const t = todayWIB(); if ((!min || t >= min) && (!max || t <= max)) { onChange(t); setOpen(false); } }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Hari Ini
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function NavBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}
