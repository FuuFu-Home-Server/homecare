"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { BookingModal } from "@/components/antrian/BookingModal";
import { VitalsModal } from "@/components/antrian/VitalsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { MenuItem } from "@/components/ui/DropdownMenu";
import { IconPlus } from "@/components/layout/icons";
import { useAuth } from "@/hooks/useAuth";
import { useQueue } from "@/hooks/useQueue";
import { usePatients } from "@/hooks/usePatients";
import { formatNik, tglWIB, todayWIB } from "@/lib/format";
import { ANTRIAN_META, JAMINAN_META } from "@/lib/status";
import type { QueueEntry } from "@/types";

export function AntrianView() {
  const today = todayWIB();
  const router = useRouter();
  const { user } = useAuth();
  const isPerawat = user.role === "perawat";
  const { queue, loading, error, createBooking, saveVitals, setStatus } = useQueue(today, "asisten");
  const { patients } = usePatients();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [vitalsFor, setVitalsFor] = useState<QueueEntry | null>(null);
  const [cancelFor, setCancelFor] = useState<QueueEntry | null>(null);

  const columns = useMemo<Column<QueueEntry>[]>(
    () => [
      {
        id: "nomor",
        header: "No.",
        align: "center",
        width: "64px",
        value: (q) => q.nomorAntrian,
        render: (q) => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {q.nomorAntrian}
          </span>
        ),
        sortable: true,
      },
      {
        id: "nama",
        header: "Pasien",
        value: (q) => q.nama,
        render: (q) => (
          <div>
            <div className="font-medium text-slate-800">{q.nama}</div>
            <div className="text-xs text-slate-400">NIK {formatNik(q.nik)}</div>
          </div>
        ),
        sortable: true,
      },
      {
        id: "jaminan",
        header: "Jaminan",
        filter: "select",
        value: (q) => JAMINAN_META[q.jaminan].label,
        render: (q) => (
          <StatusPill tone={JAMINAN_META[q.jaminan].tone}>{JAMINAN_META[q.jaminan].label}</StatusPill>
        ),
      },
      { id: "keluhan", header: "Keluhan", value: (q) => q.keluhanUtama ?? "—" },
      {
        id: "vitals",
        header: "Vitals",
        value: (q) => (q.hasVitals ? "ada" : "belum"),
        render: (q) =>
          q.hasVitals ? (
            <span className="text-xs text-slate-600">
              {q.tdSistol && q.tdDiastol ? `${q.tdSistol}/${q.tdDiastol} · ` : ""}
              {q.suhu ? `${q.suhu}°C` : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-400">belum diisi</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        filter: "select",
        value: (q) => ANTRIAN_META[q.status].label,
        render: (q) => (
          <StatusPill tone={ANTRIAN_META[q.status].tone}>{ANTRIAN_META[q.status].label}</StatusPill>
        ),
      },
      {
        id: "aksi",
        header: "",
        render: (q) => (
          <RowActions
            entry={q}
            canExamine={isPerawat}
            onVitals={() => setVitalsFor(q)}
            onCancel={() => setCancelFor(q)}
            onExamine={() => router.push(`/rekam-medis/${q.visitId}`)}
          />
        ),
      },
    ],
    [isPerawat, router],
  );

  return (
    <>
      <PageHeader
        title="Antrian & Booking"
        description={`Antrian hari ini · ${tglWIB(today)}`}
        action={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setBookingOpen(true)}>
            Booking Baru
          </Button>
        }
      />

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={queue}
        loading={loading}
        getRowId={(q) => q.visitId}
        searchPlaceholder="Cari pasien…"
        emptyTitle="Belum ada antrian hari ini"
        emptyDescription="Buat booking untuk menambahkan pasien ke antrian."
        emptyAction={<Button onClick={() => setBookingOpen(true)}>Booking Baru</Button>}
      />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        patients={patients}
        onSubmit={createBooking}
      />
      <VitalsModal
        open={vitalsFor !== null}
        onClose={() => setVitalsFor(null)}
        entry={vitalsFor}
        onSubmit={saveVitals}
      />
      <ConfirmDialog
        open={cancelFor !== null}
        onClose={() => setCancelFor(null)}
        onConfirm={async () => {
          if (cancelFor) await setStatus(cancelFor.visitId, "batal");
        }}
        title="Batalkan Antrian"
        message={`Batalkan antrian #${cancelFor?.nomorAntrian ?? ""} — ${cancelFor?.nama ?? ""}? Status akan menjadi batal.`}
        confirmLabel="Batalkan"
      />
    </>
  );
}

function RowActions({
  entry,
  canExamine,
  onVitals,
  onCancel,
  onExamine,
}: {
  entry: QueueEntry;
  canExamine: boolean;
  onVitals: () => void;
  onCancel: () => void;
  onExamine: () => void;
}) {
  if (entry.status === "selesai" || entry.status === "batal") {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const examinable = canExamine && (entry.status === "tiba" || entry.status === "diperiksa");
  const cancellable = entry.status === "terdaftar" || entry.status === "tiba";

  const vitals: MenuItem = {
    label: entry.hasVitals ? "Edit Vitals" : "Input Vitals",
    onClick: onVitals,
  };
  const items: MenuItem[] = [vitals];
  if (examinable) {
    items.push({ label: entry.status === "diperiksa" ? "Lanjutkan" : "Periksa", onClick: onExamine });
  }
  if (cancellable) {
    items.push({ label: "Batalkan Antrian", tone: "danger", onClick: onCancel });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {items.length === 1 ? (
        <Button size="sm" variant="secondary" onClick={vitals.onClick}>
          {vitals.label}
        </Button>
      ) : (
        <DropdownMenu items={items} />
      )}
    </div>
  );
}
