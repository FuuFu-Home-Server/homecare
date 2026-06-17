"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { printDocument } from "@/lib/print";
import type { Column } from "@/components/ui/DataTable";
import { RevenueChart, VisitChart } from "@/components/dashboard/TrendChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { IconKasir, IconLaporan, IconStok, IconRekamMedis, IconPrint, IconDownload } from "@/components/layout/icons";
import { useReports } from "@/hooks/useReports";
import { downloadCsv } from "@/lib/csv";
import { rupiah, tglWIB, tglJamWIB, monthWIB, daysUntil } from "@/lib/format";
import { METODE_LABEL, JAMINAN_META } from "@/lib/status";
import { cn } from "@/lib/cn";
import type {
  ClinicalReport,
  ExpenseRow,
  FinancialReport,
  InventoryReport,
  NameCount,
  TransactionRow,
} from "@/types";

type Tab = "keuangan" | "transaksi" | "klinis" | "inventaris";
const TABS: { id: Tab; label: string }[] = [
  { id: "keuangan", label: "Keuangan" },
  { id: "transaksi", label: "Transaksi" },
  { id: "klinis", label: "Klinis" },
  { id: "inventaris", label: "Inventaris" },
];

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  return Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: fmt.format(d) };
  });
}

export function LaporanView() {
  const [month, setMonth] = useState(monthWIB());
  const [tab, setTab] = useState<Tab>("keuangan");
  const { data, loading, error } = useReports(month);
  const months = useMemo(monthOptions, []);

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Keuangan, klinis & inventaris"
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <CustomSelect
              value={month}
              onChange={setMonth}
              options={months}
              className="w-44"
            />
            <Button variant="secondary" leftIcon={<IconPrint className="h-4 w-4" />} onClick={() => void printDocument()}>
              Cetak / PDF
            </Button>
          </div>
        }
      />

      <div className="no-print mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : loading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {tab === "keuangan" ? <Keuangan data={data.financial} month={month} /> : null}
          {tab === "transaksi" ? (
            <Transaksi transactions={data.transactions} expenses={data.expenses} month={month} />
          ) : null}
          {tab === "klinis" ? <Klinis data={data.clinical} month={month} /> : null}
          {tab === "inventaris" ? <Inventaris data={data.inventory} /> : null}
        </>
      )}
    </>
  );
}

function Keuangan({ data, month }: { data: FinancialReport; month: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pendapatan" value={rupiah(data.pendapatan)} sublabel={`${data.jumlahTransaksi} transaksi`} icon={<IconKasir className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Pengeluaran" value={rupiah(data.pengeluaran)} icon={<IconLaporan className="h-5 w-5" />} tone="amber" />
        <StatCard label="Laba Bersih" value={rupiah(data.laba)} icon={<IconLaporan className="h-5 w-5" />} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Rincian Pembayaran"
            action={
              <Button
                size="sm"
                variant="secondary"
                className="no-print"
                leftIcon={<IconDownload className="h-4 w-4" />}
                onClick={() =>
                  downloadCsv(
                    `keuangan-${month}`,
                    ["Kategori", "Nilai"],
                    [
                      ["Pendapatan", data.pendapatan],
                      ["Pengeluaran", data.pengeluaran],
                      ["Laba", data.laba],
                      ["Tunai", data.byMetode.tunai],
                      ["Transfer", data.byMetode.transfer],
                      ["QRIS", data.byMetode.qris],
                      ["Umum", data.byJaminan.umum],
                      ["BPJS", data.byJaminan.bpjs],
                    ],
                  )
                }
              >
                Unduh CSV
              </Button>
            }
          />
          <CardBody className="space-y-2 pt-0 text-sm">
            <p className="text-xs font-semibold text-slate-400">Metode Bayar</p>
            <Line label="Tunai" value={rupiah(data.byMetode.tunai)} />
            <Line label="Transfer" value={rupiah(data.byMetode.transfer)} />
            <Line label="QRIS" value={rupiah(data.byMetode.qris)} />
            <p className="pt-2 text-xs font-semibold text-slate-400">Jaminan</p>
            <Line label="Umum" value={rupiah(data.byJaminan.umum)} />
            <Line label="BPJS" value={rupiah(data.byJaminan.bpjs)} />
          </CardBody>
        </Card>
        <RevenueChart data={data.dailyRevenue} />
      </div>
    </div>
  );
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="no-print"
      leftIcon={<IconDownload className="h-4 w-4" />}
      onClick={onClick}
    >
      Unduh CSV
    </Button>
  );
}

function Transaksi({
  transactions,
  expenses,
  month,
}: {
  transactions: TransactionRow[];
  expenses: ExpenseRow[];
  month: string;
}) {
  const totalTransaksi = transactions.reduce((s, t) => s + t.total, 0);
  const totalPengeluaran = expenses.reduce((s, e) => s + e.jumlah, 0);

  const txColumns = useMemo<Column<TransactionRow>[]>(
    () => [
      {
        id: "paidAt",
        header: "Waktu",
        value: (t) => t.paidAt,
        sortable: true,
        render: (t) => <span className="text-slate-500">{tglJamWIB(t.paidAt)}</span>,
      },
      { id: "pasien", header: "Pasien", value: (t) => t.pasien, sortable: true },
      {
        id: "metode",
        header: "Metode",
        value: (t) => (t.metode ? METODE_LABEL[t.metode] : "-"),
        filter: "select",
        render: (t) => (
          <StatusPill tone={t.metode === "tunai" ? "success" : "brand"}>
            {t.metode ? METODE_LABEL[t.metode] : "-"}
          </StatusPill>
        ),
      },
      {
        id: "jaminan",
        header: "Jaminan",
        value: (t) => JAMINAN_META[t.jaminan].label,
        filter: "select",
        render: (t) => <StatusPill tone={JAMINAN_META[t.jaminan].tone}>{JAMINAN_META[t.jaminan].label}</StatusPill>,
      },
      {
        id: "total",
        header: "Total",
        value: (t) => t.total,
        sortable: true,
        align: "right",
        render: (t) => rupiah(t.total),
      },
      {
        id: "struk",
        header: "Struk",
        align: "right",
        render: (t) => (
          <Link
            href={`/print/struk/${t.id}`}
            target="_blank"
            className="no-print inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            <IconPrint className="h-4 w-4" /> Struk
          </Link>
        ),
      },
    ],
    [],
  );

  const expColumns = useMemo<Column<ExpenseRow>[]>(
    () => [
      {
        id: "tanggal",
        header: "Tanggal",
        value: (e) => e.tanggal,
        sortable: true,
        render: (e) => <span className="text-slate-500">{tglWIB(e.tanggal)}</span>,
      },
      {
        id: "kategori",
        header: "Kategori",
        value: (e) => e.kategori,
        filter: "select",
        render: (e) => <StatusPill tone="warning">{e.kategori}</StatusPill>,
      },
      { id: "deskripsi", header: "Deskripsi", value: (e) => e.deskripsi },
      {
        id: "jumlah",
        header: "Jumlah",
        value: (e) => e.jumlah,
        sortable: true,
        align: "right",
        render: (e) => rupiah(e.jumlah),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Daftar Transaksi <span className="text-slate-400">· {rupiah(totalTransaksi)}</span>
          </h2>
        </div>
        <DataTable
          columns={txColumns}
          data={transactions}
          getRowId={(t) => t.id}
          searchPlaceholder="Cari pasien…"
          emptyTitle="Belum ada transaksi"
          toolbar={
            transactions.length > 0 ? (
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    `transaksi-${month}`,
                    ["Waktu", "Pasien", "Metode", "Jaminan", "Total"],
                    transactions.map((t) => [
                      tglJamWIB(t.paidAt),
                      t.pasien,
                      t.metode ? METODE_LABEL[t.metode] : "-",
                      JAMINAN_META[t.jaminan].label,
                      t.total,
                    ]),
                  )
                }
              />
            ) : undefined
          }
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Daftar Pengeluaran <span className="text-slate-400">· {rupiah(totalPengeluaran)}</span>
          </h2>
        </div>
        <DataTable
          columns={expColumns}
          data={expenses}
          getRowId={(e) => e.id}
          searchPlaceholder="Cari pengeluaran…"
          emptyTitle="Belum ada pengeluaran"
          toolbar={
            expenses.length > 0 ? (
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    `pengeluaran-${month}`,
                    ["Tanggal", "Kategori", "Deskripsi", "Jumlah"],
                    expenses.map((e) => [tglWIB(e.tanggal), e.kategori, e.deskripsi, e.jumlah]),
                  )
                }
              />
            ) : undefined
          }
        />
      </section>
    </div>
  );
}

function Klinis({ data, month }: { data: ClinicalReport; month: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <StatCard label="Total Kunjungan" value={String(data.totalKunjungan)} icon={<IconRekamMedis className="h-5 w-5" />} tone="brand" />
      </div>
      <VisitChart data={data.visitTrend} />
      <RankCard
        title="Tindakan Terbanyak"
        items={data.topTreatments}
        onExport={() => downloadCsv(`tindakan-${month}`, ["Tindakan", "Jumlah"], data.topTreatments.map((d) => [d.label, d.count]))}
      />
    </div>
  );
}

function Inventaris({ data }: { data: InventoryReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Nilai Stok" value={rupiah(data.nilaiStok)} icon={<IconStok className="h-5 w-5" />} tone="brand" />
        <StatCard label="Stok Menipis" value={String(data.lowStockCount)} icon={<IconStok className="h-5 w-5" />} tone="amber" />
        <StatCard label="Hampir Kadaluarsa" value={String(data.nearExpiryCount)} icon={<IconStok className="h-5 w-5" />} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard
          title="Obat Fast-Moving"
          items={data.fastMoving}
          unit=" terjual"
          onExport={() => downloadCsv("fast-moving", ["Obat", "Terjual"], data.fastMoving.map((d) => [d.label, d.count]))}
        />
        <Card>
          <CardHeader title="Hampir Kadaluarsa" />
          <CardBody className="pt-0">
            {data.nearExpiry.length === 0 ? (
              <EmptyState title="Tidak ada" />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.nearExpiry.slice(0, 10).map((n) => (
                  <li key={n.batchId} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-slate-700">{n.nama}</span>
                      <span className="text-xs text-slate-400">
                        Batch {n.noBatch} · {tglWIB(n.tglKadaluarsa)}
                      </span>
                    </span>
                    <StatusPill tone={daysUntil(n.tglKadaluarsa) <= 30 ? "danger" : "warning"}>
                      {n.sisaHari <= 0 ? "exp" : `${n.sisaHari}h`}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RankCard({
  title,
  items,
  unit = "",
  onExport,
}: {
  title: string;
  items: NameCount[];
  unit?: string;
  onExport: () => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          items.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              className="no-print"
              leftIcon={<IconDownload className="h-4 w-4" />}
              onClick={onExport}
            >
              Unduh CSV
            </Button>
          ) : undefined
        }
      />
      <CardBody className="pt-0">
        {items.length === 0 ? (
          <EmptyState title="Belum ada data" />
        ) : (
          <ul className="space-y-2.5">
            {items.map((it) => (
              <li key={it.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-slate-700">{it.label}</span>
                  <span className="shrink-0 tabular text-slate-500">
                    {it.count}
                    {unit}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-400" style={{ width: `${(it.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="tabular text-slate-700">{value}</span>
    </div>
  );
}
