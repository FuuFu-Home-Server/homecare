"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconAlert } from "@/components/layout/icons";
import { useQueue } from "@/hooks/useQueue";
import { formatNik, tglWIB, todayWIB, umur } from "@/lib/format";
import { ANTRIAN_META, JAMINAN_META } from "@/lib/status";
import type { QueueEntry } from "@/types";

export function DoctorQueueView() {
  const router = useRouter();
  const today = todayWIB();
  const { queue, loading, error } = useQueue(today, "perawat");

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
            <div className="flex items-center gap-2 font-medium text-slate-800">
              {q.nama}
              {q.alergi ? <IconAlert className="h-4 w-4 text-red-500" /> : null}
            </div>
            <div className="text-xs text-slate-400">
              {umur(q.tglLahir)} th · NIK {formatNik(q.nik)}
            </div>
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
        align: "right",
        render: (q) => (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => router.push(`/rekam-medis/${q.visitId}`)}>
              {q.status === "diperiksa" ? "Lanjutkan" : "Periksa"}
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <>
      <PageHeader
        title="Rekam Medis"
        description={`Pasien siap diperiksa · ${tglWIB(today)}`}
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
        emptyTitle="Tidak ada pasien menunggu"
        emptyDescription="Pasien akan muncul di sini setelah asisten mencatat vitals."
      />
    </>
  );
}
