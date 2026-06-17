"use client";

import { useDynamicSegment } from "@/hooks/useRouteParam";
import { StokDetail } from "@/components/stok/StokDetail";

export function StokDetailClient() {
  const seg = useDynamicSegment();
  const medicineId = Number(seg);
  if (!seg) {
    return <p className="text-sm text-slate-400">Memuat…</p>;
  }
  if (!Number.isInteger(medicineId) || medicineId <= 0) {
    return <p className="text-sm text-slate-400">Obat tidak ditemukan.</p>;
  }
  return <StokDetail medicineId={medicineId} />;
}
