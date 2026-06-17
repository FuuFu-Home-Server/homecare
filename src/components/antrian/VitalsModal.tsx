"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { CONFIG } from "@/lib/config";
import type { QueueEntry, VitalsInput } from "@/types";
import type { VitalRange } from "@/lib/config";

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

type VitalKey = "tdSistol" | "tdDiastol" | "suhu" | "berat" | "tinggi";
type FieldErrors = Partial<Record<VitalKey, string>>;

const RANGES: Record<VitalKey, VitalRange> = CONFIG.vitals;

function rangeError(key: VitalKey, raw: string): string | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  const r = RANGES[key];
  if (n < r.min || n > r.max) return `Harus antara ${r.min}–${r.max}.`;
  return null;
}

function validate(form: FormState): FieldErrors {
  const errs: FieldErrors = {};
  for (const key of ["tdSistol", "tdDiastol", "suhu", "berat", "tinggi"] as const) {
    const e = rangeError(key, form[key]);
    if (e) errs[key] = e;
  }
  const sis = num(form.tdSistol);
  const dia = num(form.tdDiastol);
  if (!errs.tdDiastol && sis != null && dia != null && sis <= dia) {
    errs.tdDiastol = "Diastol harus lebih rendah dari sistol.";
  }
  return errs;
}

/** Keep digits + a single decimal separator (normalized to "."). */
const sanitizeDecimal = (s: string): string => {
  const cleaned = s.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const i = cleaned.indexOf(".");
  return i === -1 ? cleaned : cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, "");
};

export function VitalsModal({ open, onClose, entry, onSubmit }: VitalsModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const isPerawat = user.role === "perawat";
  const [form, setForm] = useState<FormState>(initial(entry));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  // Re-seed the form whenever a different queue entry is opened.
  const [seedId, setSeedId] = useState<number | null>(entry?.visitId ?? null);
  if (entry && entry.visitId !== seedId) {
    setSeedId(entry.visitId);
    setForm(initial(entry));
    setFieldErrors({});
    setError(null);
  }

  const set = (key: keyof FormState, val: string): void => {
    setForm((f) => ({ ...f, [key]: val }));
    if (key !== "keluhanUtama") setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(proceed: boolean): Promise<void> {
    if (!entry) return;
    setError(null);
    if (!form.keluhanUtama.trim()) return setError("Keluhan utama wajib diisi.");
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return setError("Periksa kembali nilai vitals.");
    }
    setFieldErrors({});
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
            error={fieldErrors.tdSistol}
            placeholder="120"
          />
          <Input
            label="Diastol (mmHg)"
            inputMode="numeric"
            value={form.tdDiastol}
            onChange={(e) => set("tdDiastol", e.target.value.replace(/\D/g, ""))}
            error={fieldErrors.tdDiastol}
            placeholder="80"
          />
          <Input
            label="Suhu (°C)"
            inputMode="decimal"
            value={form.suhu}
            onChange={(e) => set("suhu", sanitizeDecimal(e.target.value))}
            error={fieldErrors.suhu}
            placeholder="36.5"
          />
          <Input
            label="Berat Badan (kg)"
            inputMode="decimal"
            value={form.berat}
            onChange={(e) => set("berat", sanitizeDecimal(e.target.value))}
            error={fieldErrors.berat}
            placeholder="60"
          />
          <Input
            label="Tinggi Badan (cm)"
            inputMode="numeric"
            value={form.tinggi}
            onChange={(e) => set("tinggi", e.target.value.replace(/\D/g, ""))}
            error={fieldErrors.tinggi}
            placeholder="165"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
