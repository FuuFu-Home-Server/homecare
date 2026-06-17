"use client";

import { useDynamicSegment } from "@/hooks/useRouteParam";
import { ConsultView } from "@/components/rekam-medis/ConsultView";

export function RiwayatDetailClient() {
  const id = Number(useDynamicSegment());
  if (!Number.isInteger(id)) {
    return <p className="text-sm text-slate-400">Kunjungan tidak ditemukan.</p>;
  }
  return <ConsultView visitId={id} backHref="/riwayat" />;
}
