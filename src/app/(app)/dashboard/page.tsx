"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RevenueChart, VisitChart } from "@/components/dashboard/TrendChart";
import { LowStockCard, NearExpiryCard } from "@/components/dashboard/AlertCard";
import { getJson } from "@/lib/fetcher";
import { rupiah, tglWIB, todayWIB } from "@/lib/format";
import { IconAntrian, IconKasir, IconPasien, IconRekamMedis } from "@/components/layout/icons";
import type { DashboardData } from "@/types";

export default function DashboardPage() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ data: DashboardData }>("/api/dashboard")
      .then((r) => setD(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat dashboard."));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!d) {
    return <p className="text-sm text-slate-400">Memuat…</p>;
  }

  return (
    <>
      <PageHeader title="Dashboard" description={`Ringkasan praktik · ${tglWIB(todayWIB())}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Antrian Hari Ini"
          value={String(d.antrianHariIni)}
          sublabel={`${d.antrianAktif} masih aktif`}
          icon={<IconAntrian className="h-5 w-5" />}
          tone="brand"
          href="/antrian"
        />
        <StatCard
          label="Pendapatan Hari Ini"
          value={rupiah(d.pendapatanHariIni)}
          sublabel={`Bulan ini ${rupiah(d.pendapatanBulanIni)}`}
          icon={<IconKasir className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Total Pasien"
          value={String(d.jumlahPasien)}
          icon={<IconPasien className="h-5 w-5" />}
          tone="sky"
          href="/pasien"
        />
        <StatCard
          label="Tagihan Tertunda"
          value={String(d.tagihanTertundaCount)}
          sublabel={
            d.tagihanTertundaCount > 0
              ? rupiah(d.tagihanTertundaTotal)
              : "Tidak ada tagihan tertunda"
          }
          icon={<IconRekamMedis className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-4">
        <QuickActions />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RevenueChart data={d.revenueTrend} />
        <VisitChart data={d.visitTrend} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LowStockCard items={d.lowStock} />
        <NearExpiryCard items={d.nearExpiry} />
      </div>

      {d.tagihanTertundaCount > 0 ? (
        <p className="mt-4 text-xs text-slate-400">
          Tagihan tertunda: {d.tagihanTertundaCount} ·{" "}
          <span className="tabular">{rupiah(d.tagihanTertundaTotal)}</span>
        </p>
      ) : null}
    </>
  );
}
