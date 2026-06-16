"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { MedicineBatch } from "@/types";

export interface AdjustStockModalProps {
  open: boolean;
  onClose: () => void;
  batch: MedicineBatch | null;
  onSubmit: (batchId: number, delta: number, alasan: string) => Promise<void>;
}

export function AdjustStockModal({ open, onClose, batch, onSubmit }: AdjustStockModalProps) {
  const { toast } = useToast();
  const [arah, setArah] = useState<"tambah" | "kurang">("kurang");
  const [jumlah, setJumlah] = useState("");
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedId, setSeedId] = useState<number | null>(null);
  if (open && batch && batch.id !== seedId) {
    setSeedId(batch.id);
    setArah("kurang");
    setJumlah("");
    setAlasan("");
    setError(null);
  }

  async function submit(): Promise<void> {
    if (!batch) return;
    setError(null);
    const n = Number(jumlah);
    if (!Number.isInteger(n) || n <= 0) return setError("Jumlah harus lebih dari 0.");
    const delta = arah === "tambah" ? n : -n;
    if (batch.qty + delta < 0) return setError("Stok tidak boleh negatif.");
    setBusy(true);
    try {
      await onSubmit(batch.id, delta, alasan.trim() || "Penyesuaian stok");
      toast("Stok disesuaikan");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyesuaikan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Penyesuaian Stok"
      description={batch ? `Batch ${batch.noBatch} · stok ${batch.qty}` : undefined}
      size="sm"
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
      <div className="space-y-3">
        <div>
          <Label>Arah</Label>
          <CustomSelect
            value={arah}
            onChange={(v) => setArah(v === "tambah" ? "tambah" : "kurang")}
            options={[
              { value: "kurang", label: "Kurangi (rusak/hilang)" },
              { value: "tambah", label: "Tambah (koreksi)" },
            ]}
          />
        </div>
        <Input label="Jumlah" inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ""))} />
        <Input label="Alasan" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="cth. Rusak / kadaluarsa" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
