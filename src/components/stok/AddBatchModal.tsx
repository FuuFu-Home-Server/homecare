"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import { todayWIB } from "@/lib/format";
import type { AddBatchInput } from "@/types";

export interface AddBatchModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddBatchInput) => Promise<void>;
}

interface FormState {
  noBatch: string;
  tglKadaluarsa: string;
  qty: string;
  hargaBeli: string;
}

const EMPTY: FormState = { noBatch: "", tglKadaluarsa: "", qty: "", hargaBeli: "" };

export function AddBatchModal({ open, onClose, onSubmit }: AddBatchModalProps) {
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

  const set = (k: keyof FormState, v: string): void => setForm((f) => ({ ...f, [k]: v }));

  async function submit(): Promise<void> {
    setError(null);
    if (!form.noBatch.trim()) return setError("Nomor batch wajib diisi.");
    if (!form.tglKadaluarsa) return setError("Tanggal kadaluarsa wajib diisi.");
    const qty = Number(form.qty);
    if (!Number.isInteger(qty) || qty <= 0) return setError("Jumlah harus lebih dari 0.");
    setBusy(true);
    try {
      await onSubmit({
        noBatch: form.noBatch.trim(),
        tglKadaluarsa: form.tglKadaluarsa,
        qty,
        hargaBeli: form.hargaBeli ? Math.round(Number(form.hargaBeli)) : null,
      });
      toast("Stok masuk dicatat");
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
      title="Stok Masuk"
      description="Catat batch baru ke inventaris"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy}>
            Simpan Batch
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nomor Batch" value={form.noBatch} onChange={(e) => set("noBatch", e.target.value)} placeholder="cth. B2026XY" />
        <DatePicker
          label="Tanggal Kadaluarsa"
          value={form.tglKadaluarsa}
          onChange={(v) => set("tglKadaluarsa", v)}
          min={todayWIB()}
        />
        <Input label="Jumlah" inputMode="numeric" value={form.qty} onChange={(e) => set("qty", e.target.value.replace(/\D/g, ""))} />
        <Input label="Harga Beli / satuan (opsional)" inputMode="numeric" value={form.hargaBeli} onChange={(e) => set("hargaBeli", e.target.value.replace(/\D/g, ""))} />
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </Modal>
  );
}
