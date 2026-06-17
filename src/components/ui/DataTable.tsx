"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CONFIG } from "@/lib/config";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { IconSearch, IconFilter } from "@/components/layout/icons";

export type CellAlign = "left" | "right" | "center";

/**
 * Generic, type-safe column definition. `value` powers sorting and filtering
 * (so it must be a primitive); `render` controls display only. A column without
 * `value` is display-only (not sortable/filterable).
 */
export interface Column<T> {
  id: string;
  header: string;
  value?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  filter?: "text" | "select";
  align?: CellAlign;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  initialPageSize?: number;
  toolbar?: ReactNode;
}

type SortDir = "asc" | "desc";
interface SortState {
  colId: string;
  dir: SortDir;
}

const ALIGN: Record<CellAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  loading = false,
  searchPlaceholder = "Cari…",
  emptyTitle = "Tidak ada data",
  emptyDescription,
  emptyAction,
  initialPageSize = CONFIG.defaultPageSize,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const colById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  // Distinct option values for select-filter columns.
  const selectOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.filter === "select" && col.value) {
        const set = new Set<string>();
        for (const row of data) set.add(String(col.value(row)));
        map[col.id] = Array.from(set).sort();
      }
    }
    return map;
  }, [columns, data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((row) => {
      if (q) {
        const hit = columns.some(
          (c) => c.value && String(c.value(row)).toLowerCase().includes(q),
        );
        if (!hit) return false;
      }
      for (const [colId, fv] of Object.entries(colFilters)) {
        if (!fv) continue;
        const col = colById.get(colId);
        if (!col?.value) continue;
        const cell = String(col.value(row)).toLowerCase();
        if (col.filter === "select" ? cell !== fv.toLowerCase() : !cell.includes(fv.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [data, columns, query, colFilters, colById]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = colById.get(sort.colId);
    if (!col?.value) return filtered;
    const getVal = col.value;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "id") * dir;
    });
  }, [filtered, sort, colById]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const firstRow = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastRow = Math.min(safePage * pageSize, sorted.length);

  const toggleSort = (col: Column<T>): void => {
    if (!col.value || col.sortable === false) return;
    setPage(1);
    setSort((prev) => {
      if (prev?.colId !== col.id) return { colId: col.id, dir: "asc" };
      return prev.dir === "asc" ? { colId: col.id, dir: "desc" } : null;
    });
  };

  const hasFilters = columns.some((c) => c.filter);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {toolbar}
          {hasFilters ? (
          <FilterMenu
            columns={columns.filter((c) => c.filter === "select")}
            options={selectOptions}
            values={colFilters}
            onChange={(colId, v) => {
              setColFilters((prev) => ({ ...prev, [colId]: v }));
              setPage(1);
            }}
            onReset={() => {
              setColFilters({});
              setPage(1);
            }}
          />
          ) : null}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={pageSize > 8 ? 8 : pageSize} cols={columns.length} />
      ) : pageRows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {columns.map((col, ci) => {
                  const active = sort?.colId === col.id;
                  const canSort = !!col.value && col.sortable !== false;
                  return (
                    <th
                      key={col.id}
                      style={col.width ? { width: col.width } : undefined}
                      className={cn(
                        "whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-500",
                        ALIGN[col.align ?? "left"],
                        canSort && "cursor-pointer select-none hover:text-slate-700",
                        ci === 0 &&
                          "sticky left-0 z-20 bg-slate-50 shadow-[6px_0_8px_-4px_rgba(15,23,42,0.12)]",
                      )}
                      onClick={canSort ? () => toggleSort(col) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {canSort ? (
                          <span className="text-slate-400">
                            {active ? (sort?.dir === "asc" ? "▲" : "▼") : "↕"}
                          </span>
                        ) : null}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-slate-50 last:border-0",
                    onRowClick && "cursor-pointer hover:bg-brand-50/40",
                  )}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.id}
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-slate-700",
                        ALIGN[col.align ?? "left"],
                        col.align === "right" && "tabular",
                        ci === 0 &&
                          "sticky left-0 z-10 bg-white shadow-[6px_0_8px_-4px_rgba(15,23,42,0.10)]",
                      )}
                    >
                      {col.render ? col.render(row) : col.value ? col.value(row) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && sorted.length > 0 ? (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>Tampilkan</span>
            <CustomSelect
              size="sm"
              direction="up"
              className="w-18"
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
              options={CONFIG.pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
            />
            <span>
              {firstRow}–{lastRow} dari {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              ‹
            </PageBtn>
            <span className="px-2 tabular">
              {safePage} / {totalPages}
            </span>
            <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              ›
            </PageBtn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface FilterMenuProps<T> {
  columns: Column<T>[];
  options: Record<string, string[]>;
  values: Record<string, string>;
  onChange: (colId: string, value: string) => void;
  onReset: () => void;
}

/** Compact filter control: one button + popover panel holding all column filters. */
function FilterMenu<T>({ columns, options, values, onChange, onReset }: FilterMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCount = columns.filter((c) => values[c.id]).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
          activeCount > 0
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        <IconFilter className="h-4 w-4" />
        Filter
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Filter</span>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={onReset}
                className="cursor-pointer text-xs font-medium text-slate-500 hover:text-brand-700"
              >
                Reset semua
              </button>
            ) : null}
          </div>
          <div className="space-y-3">
            {columns.map((c, i) => (
              <div key={c.id}>
                <p className="mb-1 text-xs font-medium text-slate-500">{c.header}</p>
                <CustomSelect
                  size="sm"
                  className="w-full"
                  direction={columns.length > 1 && i === columns.length - 1 ? "up" : "down"}
                  value={values[c.id] ?? ""}
                  onChange={(v) => onChange(c.id, v)}
                  options={[
                    { value: "", label: "Semua" },
                    ...(options[c.id] ?? []).map((opt) => ({ value: opt, label: opt })),
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
