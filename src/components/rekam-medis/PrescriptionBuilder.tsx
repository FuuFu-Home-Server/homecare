"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { IconClose, IconAlert } from "@/components/layout/icons";
import { rupiah, daysUntil } from "@/lib/format";
import { CONFIG } from "@/lib/config";
import type { DispenseResult, MedicineStock, PrescriptionInput, PrescriptionView } from "@/types";

export interface PrescriptionBuilderProps {
  prescriptions: PrescriptionView[];
  medicines: MedicineStock[];
  alergi: string | null;
  onDispense: (items: PrescriptionInput[]) => Promise<DispenseResult>;
  readOnly?: boolean;
}

interface DraftLine {
  medicine: MedicineStock;
  qty: string;
  aturan: string;
}

export function PrescriptionBuilder({ prescriptions, medicines, alergi, onDispense, readOnly = false }: PrescriptionBuilderProps) {
  const { toast } = useToast();
  const [picked, setPicked] = useState<MedicineStock | null>(null);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [busy, setBusy] = useState(false);

  function addLine(med: MedicineStock): void {
    if (draft.some((d) => d.medicine.id === med.id)) {
      toast("Obat sudah ada di daftar", "info");
      return;
    }
    setDraft((d) => [...d, { medicine: med, qty: "1", aturan: "" }]);
    setPicked(null);
  }

  function updateLine(id: number, patch: Partial<Pick<DraftLine, "qty" | "aturan">>): void {
    setDraft((d) => d.map((l) => (l.medicine.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: number): void {
    setDraft((d) => d.filter((l) => l.medicine.id !== id));
  }

  async function dispense(): Promise<void> {
    const items: PrescriptionInput[] = draft
      .map((l) => ({
        medicineId: l.medicine.id,
        qty: Number(l.qty) || 0,
        aturanPakai: l.aturan.trim() || null,
      }))
      .filter((i) => i.qty > 0);
    if (items.length === 0) {
      toast("Tambahkan obat dan jumlah terlebih dahulu", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await onDispense(items);
      setDraft([]);
      toast("Resep dikeluarkan — stok berkurang (FEFO)");
      for (const w of res.warnings) {
        toast(`${w.nama}: ${w.detail}`, w.tipe === "shortfall" ? "error" : "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal dispense", "error");
    } finally {
      setBusy(false);
    }
  }

  const dispensedTotal = prescriptions.reduce((s, p) => s + p.qty * p.hargaJual, 0);

  return (
    <Card>
      <CardHeader
        title="Resep & Dispensing"
        subtitle="Stok berkurang otomatis dengan metode FEFO (First-Expired-First-Out)"
      />
      <CardBody className="space-y-4 pt-0">
        {readOnly ? null : (
        <>
        {alergi ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            <IconAlert className="h-4 w-4 shrink-0" />
            Perhatikan alergi pasien: {alergi}
          </div>
        ) : null}

        <Combobox
          options={medicines.filter((m) => m.totalQty > 0)}
          value={picked}
          onChange={addLine}
          getKey={(m) => m.id}
          getLabel={(m) => m.nama}
          getFilterText={(m) => `${m.nama} ${m.merek ?? ""}`}
          getSublabel={(m) =>
            `Stok ${m.totalQty} ${m.satuan} · ${rupiah(m.hargaJual)}${m.obatKeras ? " · obat keras" : ""}`
          }
          placeholder="Cari obat untuk diresepkan…"
          emptyText="Obat tidak ditemukan / stok habis"
          clearOnSelect
        />

        {draft.length > 0 ? (
          <div className="space-y-2">
            {draft.map((l) => {
              const sisaHari = l.medicine.nearestExpiry ? daysUntil(l.medicine.nearestExpiry) : null;
              const near = sisaHari !== null && sisaHari <= CONFIG.nearExpiryDays;
              const over = Number(l.qty) > l.medicine.totalQty;
              return (
                <div key={l.medicine.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-800">{l.medicine.nama}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        stok {l.medicine.totalQty} {l.medicine.satuan}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {near ? (
                        <StatusPill tone="warning">
                          batch terdekat exp {sisaHari} hari
                        </StatusPill>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeLine(l.medicine.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Hapus obat"
                      >
                        <IconClose className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                    <Input
                      inputMode="numeric"
                      value={l.qty}
                      onChange={(e) => updateLine(l.medicine.id, { qty: e.target.value.replace(/\D/g, "") })}
                      placeholder="Jumlah"
                      error={over ? "melebihi stok" : undefined}
                    />
                    <Input
                      value={l.aturan}
                      onChange={(e) => updateLine(l.medicine.id, { aturan: e.target.value })}
                      placeholder="Aturan pakai, cth. 3x1 sesudah makan"
                    />
                  </div>
                </div>
              );
            })}
            <Button onClick={dispense} loading={busy} className="w-full sm:w-auto">
              Dispense & Kurangi Stok
            </Button>
          </div>
        ) : null}
        </>
        )}

        {readOnly && prescriptions.length === 0 ? (
          <p className="text-sm text-slate-400">Tidak ada obat yang dikeluarkan.</p>
        ) : null}

        {prescriptions.length > 0 ? (
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Sudah Dikeluarkan ({prescriptions.length})
            </p>
            <ul className="divide-y divide-slate-100">
              {prescriptions.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="text-slate-700">{p.nama}</span>
                    {p.aturanPakai ? (
                      <span className="ml-2 text-xs text-slate-400">{p.aturanPakai}</span>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-slate-500">
                      {p.qty} {p.satuan}
                    </span>
                    <span className="ml-3 tabular font-medium text-slate-700">
                      {rupiah(p.qty * p.hargaJual)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
              <span className="text-slate-500">Total obat</span>
              <span className="tabular text-slate-800">{rupiah(dispensedTotal)}</span>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
