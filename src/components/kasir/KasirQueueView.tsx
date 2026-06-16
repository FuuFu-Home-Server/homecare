"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { useKasirQueue } from "@/hooks/useKasir";
import { rupiah, tglWIB, todayWIB } from "@/lib/format";
import { ANTRIAN_META, BILL_META, JAMINAN_META } from "@/lib/status";
import type { KasirEntry } from "@/types";

export function KasirQueueView() {
  const router = useRouter();
  const today = todayWIB();
  const { queue, loading, error } = useKasirQueue(today);

  const columns = useMemo<Column<KasirEntry>[]>(
    () => [
      {
        id: "nomor",
        header: "No.",
        align: "center",
        width: "64px",
        value: (k) => k.nomorAntrian,
        render: (k) => (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            {k.nomorAntrian}
          </span>
        ),
        sortable: true,
      },
      { id: "nama", header: "Pasien", value: (k) => k.nama, sortable: true },
      {
        id: "jaminan",
        header: "Jaminan",
        filter: "select",
        value: (k) => JAMINAN_META[k.jaminan].label,
        render: (k) => (
          <StatusPill tone={JAMINAN_META[k.jaminan].tone}>{JAMINAN_META[k.jaminan].label}</StatusPill>
        ),
      },
      {
        id: "status",
        header: "Status Kunjungan",
        value: (k) => ANTRIAN_META[k.status].label,
        render: (k) => (
          <StatusPill tone={ANTRIAN_META[k.status].tone}>{ANTRIAN_META[k.status].label}</StatusPill>
        ),
      },
      {
        id: "tagihan",
        header: "Tagihan",
        align: "right",
        value: (k) => k.total ?? 0,
        render: (k) =>
          k.billStatus ? (
            <span className="inline-flex items-center gap-2">
              {k.total != null ? rupiah(k.total) : "—"}
              <StatusPill tone={BILL_META[k.billStatus].tone}>{BILL_META[k.billStatus].label}</StatusPill>
            </span>
          ) : (
            <span className="text-slate-400">belum dibuat</span>
          ),
      },
      {
        id: "aksi",
        header: "",
        align: "right",
        render: (k) => (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => router.push(`/kasir/${k.visitId}`)}>
              Proses Pembayaran
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <>
      <PageHeader title="Kasir" description={`Menunggu pembayaran · ${tglWIB(today)}`} />
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      <DataTable
        columns={columns}
        data={queue}
        loading={loading}
        getRowId={(k) => k.visitId}
        searchPlaceholder="Cari pasien…"
        emptyTitle="Tidak ada tagihan menunggu"
        emptyDescription="Tagihan muncul setelah perawat menyelesaikan pemeriksaan."
      />
    </>
  );
}
