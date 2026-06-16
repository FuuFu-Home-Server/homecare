"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { formatNik, umur } from "@/lib/format";
import { JAMINAN_META } from "@/lib/status";
import type { Patient, Visit } from "@/types";

export interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  patients: Patient[];
  preselected?: Patient | null;
  onSubmit: (patientId: number, keluhan: string | null) => Promise<Visit>;
}

export function BookingModal({ open, onClose, patients, preselected, onSubmit }: BookingModalProps) {
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(preselected ?? null);
  const [keluhan, setKeluhan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-seed from `preselected` on each open edge (the prop changes after mount).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPatient(preselected ?? null);
      setKeluhan("");
      setError(null);
    }
  }

  async function submit(): Promise<void> {
    setError(null);
    if (!patient) return setError("Pilih pasien terlebih dahulu.");
    setBusy(true);
    try {
      const visit = await onSubmit(patient.id, keluhan.trim() || null);
      toast(`Booking dibuat — nomor antrian ${visit.nomorAntrian}`);
      setPatient(null);
      setKeluhan("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Booking & Antrian Baru"
      description="Pilih pasien untuk masuk antrian hari ini"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy}>
            Buat Antrian
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Combobox
          label="Pasien"
          options={patients}
          value={patient}
          onChange={setPatient}
          onClear={() => setPatient(null)}
          getKey={(p) => p.id}
          getLabel={(p) => p.nama}
          getFilterText={(p) => `${p.nama} ${p.nik}`}
          getSublabel={(p) => `NIK ${formatNik(p.nik)}`}
          placeholder="Cari nama atau NIK…"
          emptyText="Pasien tidak ditemukan"
        />

        {patient ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{patient.nama}</span>
              <StatusPill tone={JAMINAN_META[patient.jaminan].tone}>
                {JAMINAN_META[patient.jaminan].label}
              </StatusPill>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {umur(patient.tglLahir)} tahun · {patient.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
            </p>
            {patient.alergi ? (
              <p className="mt-1 text-xs font-medium text-red-600">⚠ {patient.alergi}</p>
            ) : null}
          </div>
        ) : null}

        <Textarea
          label="Keluhan Utama (opsional)"
          rows={2}
          value={keluhan}
          onChange={(e) => setKeluhan(e.target.value)}
          placeholder="cth. Demam dan batuk sejak 2 hari"
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
