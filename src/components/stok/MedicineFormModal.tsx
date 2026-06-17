"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/components/ui/Toast";
import type { BentukObat, CreateMedicineInput } from "@/types";

export interface MedicineFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMedicineInput) => Promise<void>;
}

const BENTUK: { value: BentukObat; label: string }[] = [
  { value: "tablet", label: "Tablet" },
  { value: "kapsul", label: "Kapsul" },
  { value: "sirup", label: "Sirup" },
  { value: "salep", label: "Salep" },
  { value: "injeksi", label: "Injeksi" },
  { value: "tetes", label: "Tetes" },
];

interface FormState {
  nama: string;
  bentuk: BentukObat;
  satuan: string;
  hargaJual: string;
  obatKeras: boolean;
  isConsumable: boolean;
}

const EMPTY: FormState = {
  nama: "",
  bentuk: "tablet",
  satuan: "",
  hargaJual: "",
  obatKeras: false,
  isConsumable: false,
};

export function MedicineFormModal({ open, onClose, onSubmit }: MedicineFormModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(EMPTY);
      setError(null);
    }
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]): void =>
    setForm((f) => ({ ...f, [k]: v }));

  function bentuk(v: string): BentukObat {
    return BENTUK.find((b) => b.value === v)?.value ?? "tablet";
  }

  async function submit(): Promise<void> {
    setError(null);
    if (!form.nama.trim()) return setError("Nama obat wajib diisi.");
    if (!form.satuan.trim()) return setError("Satuan wajib diisi.");
    const harga = Number(form.hargaJual);
    if (!Number.isFinite(harga) || harga < 0) return setError("Harga jual tidak valid.");
    setBusy(true);
    try {
      await onSubmit({
        nama: form.nama.trim(),
        merek: null,
        bentuk: form.bentuk,
        satuan: form.satuan.trim(),
        hargaJual: Math.round(harga),
        obatKeras: form.obatKeras,
        isConsumable: form.isConsumable,
        supplier: null,
      });
      toast("Obat ditambahkan");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Obat / BMHP"
      description="Tambahkan item ke master inventaris"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Nama (generik)" value={form.nama} onChange={(e) => set("nama", e.target.value)} />
        </div>
        <div>
          <Label>Bentuk</Label>
          <CustomSelect value={form.bentuk} onChange={(v) => set("bentuk", bentuk(v))} options={BENTUK} />
        </div>
        <Input label="Satuan" value={form.satuan} onChange={(e) => set("satuan", e.target.value)} placeholder="tablet, botol, ampul" />
        <div className="sm:col-span-2">
          <MoneyInput
            label="Harga Jual"
            value={form.hargaJual}
            onChange={(v) => set("hargaJual", v)}
          />
        </div>
        <div className="flex items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.obatKeras}
              onChange={(e) => set("obatKeras", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Obat keras / terkontrol
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isConsumable}
              onChange={(e) => set("isConsumable", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            BMHP (bukan obat)
          </label>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </Modal>
  );
}
