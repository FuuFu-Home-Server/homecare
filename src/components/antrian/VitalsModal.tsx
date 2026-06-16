"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import type { QueueEntry, VitalsInput } from "@/types";

export interface VitalsModalProps {
  open: boolean;
  onClose: () => void;
  entry: QueueEntry | null;
  onSubmit: (visitId: number, vitals: VitalsInput) => Promise<void>;
}

interface FormState {
  keluhanUtama: string;
  tdSistol: string;
  tdDiastol: string;
  suhu: string;
  berat: string;
  tinggi: string;
}

function initial(entry: QueueEntry | null): FormState {
  return {
    keluhanUtama: entry?.keluhanUtama ?? "",
    tdSistol: entry?.tdSistol != null ? String(entry.tdSistol) : "",
    tdDiastol: entry?.tdDiastol != null ? String(entry.tdDiastol) : "",
    suhu: entry?.suhu != null ? String(entry.suhu) : "",
    berat: entry?.berat != null ? String(entry.berat) : "",
    tinggi: entry?.tinggi != null ? String(entry.tinggi) : "",
  };
}

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

export function VitalsModal({ open, onClose, entry, onSubmit }: VitalsModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const isPerawat = user.role === "perawat";
  const [form, setForm] = useState<FormState>(initial(entry));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-seed the form whenever a different queue entry is opened.
  const [seedId, setSeedId] = useState<number | null>(entry?.visitId ?? null);
  if (entry && entry.visitId !== seedId) {
    setSeedId(entry.visitId);
    setForm(initial(entry));
  }

  const set = (key: keyof FormState, val: string): void => setForm((f) => ({ ...f, [key]: val }));

  async function submit(proceed: boolean): Promise<void> {
    if (!entry) return;
    setError(null);
    if (!form.keluhanUtama.trim()) return setError("Keluhan utama wajib diisi.");
    setBusy(true);
    const visitId = entry.visitId;
    try {
      await onSubmit(visitId, {
        keluhanUtama: form.keluhanUtama.trim(),
        tdSistol: num(form.tdSistol),
        tdDiastol: num(form.tdDiastol),
        suhu: num(form.suhu),
        berat: num(form.berat),
        tinggi: num(form.tinggi),
      });
      onClose();
      if (proceed) {
        router.push(`/rekam-medis/${visitId}`);
      } else {
        toast("Vitals tersimpan — pasien siap diperiksa");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan vitals.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? `Vitals — ${entry.nama}` : "Vitals"}
      description={entry ? `Antrian #${entry.nomorAntrian}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          {isPerawat ? (
            <>
              <Button variant="secondary" onClick={() => submit(false)} loading={busy}>
                Simpan
              </Button>
              <Button onClick={() => submit(true)} loading={busy}>
                Simpan & Periksa
              </Button>
            </>
          ) : (
            <Button onClick={() => submit(false)} loading={busy}>
              Simpan & Siap Diperiksa
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Textarea
          label="Keluhan Utama"
          rows={2}
          value={form.keluhanUtama}
          onChange={(e) => set("keluhanUtama", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tekanan Darah Sistol (mmHg)"
            inputMode="numeric"
            value={form.tdSistol}
            onChange={(e) => set("tdSistol", e.target.value.replace(/\D/g, ""))}
            placeholder="120"
          />
          <Input
            label="Diastol (mmHg)"
            inputMode="numeric"
            value={form.tdDiastol}
            onChange={(e) => set("tdDiastol", e.target.value.replace(/\D/g, ""))}
            placeholder="80"
          />
          <Input
            label="Suhu (°C)"
            inputMode="decimal"
            value={form.suhu}
            onChange={(e) => set("suhu", e.target.value)}
            placeholder="36.5"
          />
          <Input
            label="Berat Badan (kg)"
            inputMode="decimal"
            value={form.berat}
            onChange={(e) => set("berat", e.target.value)}
            placeholder="60"
          />
          <Input
            label="Tinggi Badan (cm)"
            inputMode="numeric"
            value={form.tinggi}
            onChange={(e) => set("tinggi", e.target.value.replace(/\D/g, ""))}
            placeholder="165"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
