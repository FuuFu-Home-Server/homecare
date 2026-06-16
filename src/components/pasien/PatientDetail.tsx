"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { BookingModal } from "@/components/antrian/BookingModal";
import { RekamMedisModal } from "@/components/pasien/RekamMedisModal";
import { PatientRegisterModal } from "@/components/pasien/PatientRegisterModal";
import { IconAlert, IconAntrian } from "@/components/layout/icons";
import { postJson, patchJson } from "@/lib/fetcher";
import { formatNik, rupiah, tglWIB, umur } from "@/lib/format";
import { ANTRIAN_META, BILL_META, JAMINAN_META } from "@/lib/status";
import type { CreatePatientInput, Patient, PatientHistoryItem, Visit } from "@/types";

export interface PatientDetailProps {
  patient: Patient;
  history: PatientHistoryItem[];
}

export function PatientDetail({ patient, history }: PatientDetailProps) {
  const router = useRouter();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [recordVisitId, setRecordVisitId] = useState<number | null>(null);

  const columns = useMemo<Column<PatientHistoryItem>[]>(
    () => [
      {
        id: "tanggal",
        header: "Tanggal",
        value: (h) => h.tanggal,
        render: (h) => tglWIB(h.tanggal),
        sortable: true,
      },
      { id: "keluhan", header: "Keluhan", value: (h) => h.keluhanUtama ?? "—" },
      {
        id: "diagnosa",
        header: "Asuhan Keperawatan",
        value: (h) => h.diagnoses || "—",
        render: (h) => h.diagnoses || <span className="text-slate-400">—</span>,
      },
      {
        id: "status",
        header: "Status",
        value: (h) => ANTRIAN_META[h.status].label,
        render: (h) => (
          <StatusPill tone={ANTRIAN_META[h.status].tone}>{ANTRIAN_META[h.status].label}</StatusPill>
        ),
      },
      {
        id: "total",
        header: "Biaya",
        align: "right",
        value: (h) => h.total ?? 0,
        render: (h) =>
          h.total != null ? (
            <span className="inline-flex items-center gap-2">
              {rupiah(h.total)}
              {h.billStatus ? (
                <StatusPill tone={BILL_META[h.billStatus].tone}>
                  {BILL_META[h.billStatus].label}
                </StatusPill>
              ) : null}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
    ],
    [],
  );

  async function book(patientId: number, keluhan: string | null): Promise<Visit> {
    const data = await postJson<{ visit: Visit }>("/api/visits", { patientId, keluhan });
    router.push("/antrian");
    return data.visit;
  }

  return (
    <>
      <PageHeader
        title={patient.nama}
        description={`No. RM ${patient.noRm} · NIK ${formatNik(patient.nik)}`}
        action={
          <>
            <Button variant="secondary" onClick={() => router.push("/pasien")}>
              Kembali
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button leftIcon={<IconAntrian className="h-4 w-4" />} onClick={() => setBookingOpen(true)}>
              Booking
            </Button>
          </>
        }
      />

      {patient.alergi ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <IconAlert className="h-5 w-5 shrink-0" />
          Alergi: {patient.alergi}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader title="Identitas" />
            <dl className="space-y-3 px-5 pb-5 text-sm">
              <Row label="Umur">{umur(patient.tglLahir)} tahun</Row>
              <Row label="Tanggal Lahir">{tglWIB(patient.tglLahir)}</Row>
              <Row label="Jenis Kelamin">
                {patient.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
              </Row>
              <Row label="Jaminan">
                <StatusPill tone={JAMINAN_META[patient.jaminan].tone}>
                  {JAMINAN_META[patient.jaminan].label}
                  {patient.jaminan === "bpjs" && patient.bpjsNo ? ` · ${patient.bpjsNo}` : ""}
                </StatusPill>
              </Row>
              <Row label="Telepon">{patient.telepon ?? "—"}</Row>
              <Row label="Alamat">{patient.alamat ?? "—"}</Row>
              <Row label="Agama">{patient.agama ?? "—"}</Row>
              <Row label="Pekerjaan">{patient.pekerjaan ?? "—"}</Row>
              <Row label="Pendidikan">{patient.pendidikan ?? "—"}</Row>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Riwayat & Gaya Hidup" />
            <dl className="space-y-3 px-5 pb-5 text-sm">
              <Row label="Status Nikah">{patient.statusNikah ?? "—"}</Row>
              <Row label="Merokok">{patient.merokok ?? "—"}</Row>
              <Row label="Alkohol">{patient.alkohol ?? "—"}</Row>
              <Row label="Pola Makan">{patient.polaMakan ?? "—"}</Row>
              <Row label="Riwayat Keluarga">{patient.riwayatKeluarga ?? "—"}</Row>
            </dl>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Riwayat Kunjungan ({history.length})
          </h3>
          <DataTable
            columns={columns}
            data={history}
            getRowId={(h) => h.visitId}
            onRowClick={(h) => setRecordVisitId(h.visitId)}
            searchPlaceholder="Cari riwayat…"
            emptyTitle="Belum ada riwayat kunjungan"
            initialPageSize={10}
          />
        </div>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        patients={[patient]}
        preselected={patient}
        onSubmit={book}
      />

      <RekamMedisModal visitId={recordVisitId} onClose={() => setRecordVisitId(null)} />

      <PatientRegisterModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        patient={patient}
        onSubmit={async (input: CreatePatientInput) => {
          await patchJson(`/api/patients/${patient.id}`, input);
          router.refresh();
        }}
      />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{children}</dd>
    </div>
  );
}
