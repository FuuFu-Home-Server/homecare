"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconClose } from "@/components/layout/icons";
import { cn } from "@/lib/cn";
import { NURSING_CATALOG, KATEGORI_LABEL, KATEGORI_ORDER } from "@/lib/nursing";
import type { InterventionKategori, VisitIntervention } from "@/types";

export interface AsuhanKeperawatanPickerProps {
  interventions: VisitIntervention[];
  onAdd: (kategori: InterventionKategori, label: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  readOnly?: boolean;
}

export function AsuhanKeperawatanPicker({
  interventions,
  onAdd,
  onRemove,
  readOnly = false,
}: AsuhanKeperawatanPickerProps) {
  return (
    <Card>
      <CardHeader
        title="Asuhan Keperawatan"
        subtitle="Pilih masalah, etiologi, dan intervensi keperawatan"
      />
      <CardBody className="space-y-5 pt-0">
        {KATEGORI_ORDER.map((kategori) => (
          <KategoriSection
            key={kategori}
            kategori={kategori}
            selected={interventions.filter((i) => i.kategori === kategori)}
            onAdd={onAdd}
            onRemove={onRemove}
            readOnly={readOnly}
          />
        ))}
      </CardBody>
    </Card>
  );
}

interface KategoriSectionProps {
  kategori: InterventionKategori;
  selected: VisitIntervention[];
  onAdd: (kategori: InterventionKategori, label: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  readOnly: boolean;
}

function KategoriSection({ kategori, selected, onAdd, onRemove, readOnly }: KategoriSectionProps) {
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");

  const catalog = NURSING_CATALOG[kategori];
  const byLabel = new Map(selected.map((i) => [i.label, i]));
  const extras = selected.filter((i) => !catalog.includes(i.label));

  async function toggle(label: string): Promise<void> {
    const existing = byLabel.get(label);
    setBusy(true);
    try {
      if (existing) await onRemove(existing.id);
      else await onAdd(kategori, label);
    } finally {
      setBusy(false);
    }
  }

  async function addCustom(): Promise<void> {
    const label = custom.trim();
    if (!label || byLabel.has(label)) {
      setCustom("");
      return;
    }
    setBusy(true);
    try {
      await onAdd(kategori, label);
      setCustom("");
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {KATEGORI_LABEL[kategori]}
        </p>
        {selected.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {selected.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-sm text-brand-700"
              >
                {i.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {KATEGORI_LABEL[kategori]}
      </p>
      <div className="flex flex-wrap gap-2">
        {catalog.map((label) => {
          const active = byLabel.has(label);
          return (
            <button
              key={label}
              type="button"
              disabled={busy}
              onClick={() => toggle(label)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors disabled:opacity-60",
                active
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-brand-300",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {extras.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {extras.map((i) => (
            <li
              key={i.id}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-sm text-brand-700"
            >
              {i.label}
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(i.id)}
                className="text-brand-400 hover:text-red-600"
                aria-label="Hapus"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addCustom();
            }
          }}
          placeholder="Tambah lainnya…"
          disabled={busy}
        />
        <Button variant="secondary" onClick={addCustom} disabled={busy || !custom.trim()}>
          Tambah
        </Button>
      </div>
    </div>
  );
}
