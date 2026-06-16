"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Input";
import { IconSearch } from "@/components/layout/icons";

/**
 * Generic typed autocomplete/combobox. One implementation reused for patient
 * search (NIK/name) and medicine picker. Client-side substring
 * filter over `options` (datasets here are small); keyboard nav + match
 * highlight + empty state built in.
 */
export interface ComboboxProps<T> {
  options?: T[];
  value: T | null;
  onChange: (item: T) => void;
  /** When set, shows a clear (×) button while a value is selected. */
  onClear?: () => void;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  /** Text searched against (defaults to label). Include e.g. NIK here. */
  getFilterText?: (item: T) => string;
  /** Async search seam. When set, results come from here instead of `options`. */
  onSearch?: (query: string) => Promise<T[]>;
  getSublabel?: (item: T) => string;
  label?: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Keep the input editable after a selection (e.g. medicine picker). */
  clearOnSelect?: boolean;
}

export function Combobox<T>({
  options = [],
  value,
  onChange,
  onClear,
  getKey,
  getLabel,
  getFilterText,
  onSearch,
  getSublabel,
  label,
  placeholder = "Cari…",
  emptyText = "Tidak ditemukan",
  disabled = false,
  clearOnSelect = false,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; flip: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    flip: false,
  });

  // Debounce the query (150ms) — mirrors a real async search seam.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Outside-click closes. The list lives in a portal, so check both refs.
  useEffect(() => {
    const onDocClick = (e: MouseEvent): void => {
      if (!(e.target instanceof Node)) return;
      if (rootRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const [remote, setRemote] = useState<T[]>([]);

  // Remote search seam: fetch results for the debounced query (race-guarded).
  useEffect(() => {
    if (!onSearch) return;
    let alive = true;
    void onSearch(debounced).then((res) => {
      if (alive) setRemote(res);
    });
    return () => {
      alive = false;
    };
  }, [onSearch, debounced]);

  const filtered = useMemo(() => {
    if (onSearch) return remote.slice(0, 8);
    const q = debounced.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options
      .filter((o) => (getFilterText ? getFilterText(o) : getLabel(o)).toLowerCase().includes(q))
      .slice(0, 8);
  }, [onSearch, remote, options, debounced, getFilterText, getLabel]);

  useEffect(() => {
    setActive(0);
  }, [debounced]);

  // Position the portalled list against the field, flipping up when there is
  // no room below (the list is fixed-positioned so it escapes modal/table clip).
  const place = useCallback((): void => {
    const el = fieldRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const LIST_MAX = 264;
    const spaceBelow = window.innerHeight - r.bottom;
    const flip = spaceBelow < LIST_MAX + 12 && r.top > spaceBelow;
    setCoords({ top: flip ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, flip });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, filtered.length, place]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const display = value && !open ? getLabel(value) : query;

  const select = (item: T): void => {
    onChange(item);
    setOpen(false);
    setQuery(clearOnSelect ? "" : getLabel(item));
  };

  const clear = (): void => {
    onClear?.();
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[active];
      if (item) select(item);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {label ? <Label>{label}</Label> : null}
      <div ref={fieldRef} className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={display}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:bg-slate-50",
            onClear && value ? "pr-9" : "pr-3",
          )}
        />
        {onClear && value && !disabled ? (
          <button
            type="button"
            aria-label="Hapus pilihan"
            onClick={clear}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                transform: coords.flip ? "translateY(-100%)" : undefined,
              }}
              className="z-70 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-slate-400">{emptyText}</li>
              ) : (
                filtered.map((item, i) => (
                  <li key={getKey(item)}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                        i === active ? "bg-brand-50" : "hover:bg-slate-50",
                      )}
                    >
                      <Highlight text={getLabel(item)} query={debounced} />
                      {getSublabel ? (
                        <span className="text-xs text-slate-400">{getSublabel(item)}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim();
  if (!q) return <span className="text-slate-700">{text}</span>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span className="text-slate-700">{text}</span>;
  return (
    <span className="text-slate-700">
      {text.slice(0, idx)}
      <mark className="bg-transparent font-semibold text-brand-700">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}
