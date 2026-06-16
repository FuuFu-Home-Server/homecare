"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { IconAlert } from "@/components/layout/icons";
import { SoapForm } from "@/components/rekam-medis/SoapForm";
import { AsuhanKeperawatanPicker } from "@/components/rekam-medis/AsuhanKeperawatanPicker";
import { PrescriptionBuilder } from "@/components/rekam-medis/PrescriptionBuilder";
import { useAuth } from "@/hooks/useAuth";
import { useConsult } from "@/hooks/useConsult";
import { formatNik, umur } from "@/lib/format";
import { ANTRIAN_META, JAMINAN_META } from "@/lib/status";

export interface ConsultViewProps {
  visitId: number;
  backHref?: string;
}

export function ConsultView({ visitId, backHref = "/rekam-medis" }: ConsultViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user.role === "perawat";
  const {
    bundle,
    medicines,
    loading,
    error,
    saveSoap,
    addIntervention,
    removeIntervention,
    dispense,
    finishConsult,
  } = useConsult(visitId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error ?? "Kunjungan tidak ditemukan."}</p>
          <Button variant="secondary" className="mt-3" onClick={() => router.push(backHref)}>
            Kembali
          </Button>
        </CardBody>
      </Card>
    );
  }

  const { entry, patient } = bundle;
  // Asisten (and any non-perawat) gets read-only access to the record.
  const locked = !canEdit || entry.status === "selesai" || entry.status === "batal";

  async function finish(): Promise<void> {
    await finishConsult();
    toast("Konsultasi selesai — lanjut ke kasir");
    router.push("/rekam-medis");
  }

  return (
    <>
      <PageHeader
        title={`Pemeriksaan — ${patient.nama}`}
        description={`No. RM ${patient.noRm} · Antrian #${entry.nomorAntrian} · ${umur(patient.tglLahir)} th · NIK ${formatNik(patient.nik)}`}
        action={
          <>
            <Button variant="secondary" onClick={() => router.push(backHref)}>
              Kembali
            </Button>
            {locked ? null : <Button onClick={finish}>Selesai Konsultasi</Button>}
          </>
        }
      />

      {locked ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          <StatusPill tone={ANTRIAN_META[entry.status].tone}>
            {ANTRIAN_META[entry.status].label}
          </StatusPill>
          Rekam medis terkunci — hanya bisa dilihat, tidak dapat diubah.
        </div>
      ) : null}

      {patient.alergi ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <IconAlert className="h-5 w-5 shrink-0" />
          ALERGI: {patient.alergi}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <SoapForm notes={bundle.soapNotes} onSave={saveSoap} readOnly={locked} />
          <AsuhanKeperawatanPicker
            interventions={bundle.interventions}
            onAdd={addIntervention}
            onRemove={removeIntervention}
            readOnly={locked}
          />
          <PrescriptionBuilder
            prescriptions={bundle.prescriptions}
            medicines={medicines}
            alergi={patient.alergi}
            onDispense={dispense}
            readOnly={locked}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Identitas & Jaminan"
              action={
                <Link
                  href={`/pasien/${entry.patientId}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Profil Pasien →
                </Link>
              }
            />
            <CardBody className="space-y-2 pt-0 text-sm">
              <Info label="Jaminan">
                <StatusPill tone={JAMINAN_META[patient.jaminan].tone}>
                  {JAMINAN_META[patient.jaminan].label}
                </StatusPill>
              </Info>
              <Info label="Jenis Kelamin">
                {patient.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
              </Info>
              <Info label="Telepon">{patient.telepon ?? "—"}</Info>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vitals" subtitle="Dicatat oleh asisten" />
            <CardBody className="grid grid-cols-2 gap-3 pt-0 text-sm">
              <Vital label="Tekanan Darah" value={entry.tdSistol && entry.tdDiastol ? `${entry.tdSistol}/${entry.tdDiastol} mmHg` : "—"} />
              <Vital label="Suhu" value={entry.suhu ? `${entry.suhu} °C` : "—"} />
              <Vital label="Berat Badan" value={entry.berat ? `${entry.berat} kg` : "—"} />
              <Vital label="Tinggi Badan" value={entry.tinggi ? `${entry.tinggi} cm` : "—"} />
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Keluhan Utama</p>
                <p className="text-slate-700">{entry.keluhanUtama ?? "—"}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Log Akses Rekam Medis" subtitle="Jejak audit (append-only)" />
            <CardBody className="pt-0">
              {bundle.accessLog.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada aktivitas.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-500">
                  {bundle.accessLog.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span>{a.detail ?? a.action}</span>
                      <span className="shrink-0 text-slate-400">{a.action}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700">{children}</span>
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
