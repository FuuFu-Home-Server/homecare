"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Input";
import { IconCheck } from "@/components/layout/icons";

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  size?: "sm" | "md";
  /** Open the list above the button (use when near the bottom of a container). */
  direction?: "down" | "up";
  className?: string;
  buttonClassName?: string;
}

/**
 * Styled select that renders its own option list (no native <select> chrome).
 * Keyboard: ↑/↓ to move, Enter to pick, Esc to close. Closes on outside click.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "Pilih…",
  size = "md",
  direction = "down",
  className,
  buttonClassName,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [coords, setCoords] = useState<{ left: number; width: number; top: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const place = (): void => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const needed = Math.min(240, options.length * 36 + 8);
    const below = window.innerHeight - r.bottom;
    const up = direction === "up" || (below < needed && r.top > below);
    setCoords({
      left: r.left,
      width: r.width,
      top: up ? r.top : r.bottom,
      up,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = (): void => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  const pick = (v: string): void => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === "ArrowDown" || (e.key === "Enter" && !open)) {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const opt = options[active];
      if (opt) pick(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {label ? <Label>{label}</Label> : null}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white text-left text-slate-700 transition-colors hover:border-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30",
          size === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-3 text-sm",
          buttonClassName,
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && coords
        ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: "fixed",
            left: coords.left,
            width: coords.width,
            ...(coords.up
              ? { bottom: window.innerHeight - coords.top + 4 }
              : { top: coords.top + 4 }),
          }}
          className={cn(
            "z-60 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
          )}
        >
          {options.map((opt, i) => {
            const isSel = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left text-sm",
                    i === active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {opt.label}
                  {isSel ? <IconCheck className="h-4 w-4 text-brand-600" /> : null}
                </button>
              </li>
            );
          })}
        </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
