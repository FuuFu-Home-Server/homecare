"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PatientRegisterModal } from "@/components/pasien/PatientRegisterModal";
import { BookingModal } from "@/components/antrian/BookingModal";
import { IconPlus, IconPasien, IconRekamMedis, IconAntrian, IconClose } from "@/components/layout/icons";
import { usePatients } from "@/hooks/usePatients";
import { postJson } from "@/lib/fetcher";
import { formatNik, umur } from "@/lib/format";
import { JAMINAN_META } from "@/lib/status";
import type { Patient, Visit } from "@/types";

export function PasienView() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { patients, loading, error, createPatient, updatePatient, deletePatient } = usePatients();
  const [registerOpen, setRegisterOpen] = useState(params.get("baru") === "1");
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [bookingFor, setBookingFor] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const columns = useMemo<Column<Patient>[]>(
    () => [
      {
        id: "noRm",
        header: "No. RM",
        value: (p) => p.noRm,
        render: (p) => <span className="tabular font-semibold text-brand-700">{p.noRm}</span>,
        sortable: true,
      },
      { id: "nama", header: "Nama", value: (p) => p.nama, sortable: true },
      { id: "nik", header: "NIK", value: (p) => p.nik, render: (p) => formatNik(p.nik) },
      {
        id: "umur",
        header: "Umur",
        align: "right",
        value: (p) => umur(p.tglLahir),
        render: (p) => `${umur(p.tglLahir)} th`,
        sortable: true,
      },
      {
        id: "jk",
        header: "Gender",
        value: (p) => (p.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"),
      },
      {
        id: "jaminan",
        header: "Jaminan",
        filter: "select",
        value: (p) => JAMINAN_META[p.jaminan].label,
        render: (p) => (
          <StatusPill tone={JAMINAN_META[p.jaminan].tone}>{JAMINAN_META[p.jaminan].label}</StatusPill>
        ),
      },
      {
        id: "alergi",
        header: "Alergi",
        value: (p) => (p.alergi ? "Ya" : "Tidak"),
        render: (p) =>
          p.alergi ? (
            <StatusPill tone="danger">{p.alergi}</StatusPill>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        id: "aksi",
        header: "",
        align: "right",
        render: (p) => (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                {
                  label: "Lihat Detail",
                  icon: <IconPasien className="h-4 w-4" />,
                  onClick: () => router.push(`/pasien/${p.id}`),
                },
                {
                  label: "Booking Antrian",
                  icon: <IconAntrian className="h-4 w-4" />,
                  onClick: () => setBookingFor(p),
                },
                {
                  label: "Edit Data",
                  icon: <IconRekamMedis className="h-4 w-4" />,
                  onClick: () => setEditPatient(p),
                },
                {
                  label: "Hapus",
                  icon: <IconClose className="h-4 w-4" />,
                  tone: "danger",
                  onClick: () => setDeleteTarget(p),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [router],
  );

  async function bookPatient(patientId: number, keluhan: string | null): Promise<Visit> {
    const data = await postJson<{ visit: Visit }>("/api/visits", { patientId, keluhan });
    router.push("/antrian");
    return data.visit;
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await deletePatient(deleteTarget.id);
      toast("Pasien dihapus");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus pasien", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Pasien"
        description={`${patients.length} pasien terdaftar`}
        action={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setRegisterOpen(true)}>
            Pasien Baru
          </Button>
        }
      />

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        getRowId={(p) => p.id}
        onRowClick={(p) => router.push(`/pasien/${p.id}`)}
        searchPlaceholder="Cari No. RM, nama, atau NIK…"
        emptyTitle="Belum ada pasien"
        emptyDescription="Daftarkan pasien pertama untuk memulai."
        emptyAction={<Button onClick={() => setRegisterOpen(true)}>Pasien Baru</Button>}
      />

      <PatientRegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmit={async (input) => {
          await createPatient(input);
        }}
      />

      <PatientRegisterModal
        open={editPatient !== null}
        patient={editPatient}
        onClose={() => setEditPatient(null)}
        onSubmit={async (input) => {
          if (editPatient) await updatePatient(editPatient.id, input);
        }}
      />

      <BookingModal
        open={bookingFor !== null}
        onClose={() => setBookingFor(null)}
        patients={patients}
        preselected={bookingFor}
        onSubmit={bookPatient}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Pasien"
        message={`Hapus data ${deleteTarget?.nama ?? ""}? Tindakan ini tidak bisa dibatalkan. Pasien dengan riwayat kunjungan tidak dapat dihapus.`}
        confirmLabel="Hapus"
      />
    </>
  );
}
