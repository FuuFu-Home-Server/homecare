"use client";

import { useDynamicSegment } from "@/hooks/useRouteParam";
import { StokDetail } from "@/components/stok/StokDetail";

export function StokDetailClient() {
  const medicineId = Number(useDynamicSegment());
  if (!Number.isInteger(medicineId)) {
    return <p className="text-sm text-slate-400">Obat tidak ditemukan.</p>;
  }
  return <StokDetail medicineId={medicineId} />;
}
