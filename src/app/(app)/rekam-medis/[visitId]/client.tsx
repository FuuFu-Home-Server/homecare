"use client";

import { useDynamicSegment } from "@/hooks/useRouteParam";
import { ConsultView } from "@/components/rekam-medis/ConsultView";

export function ConsultClient() {
  const seg = useDynamicSegment();
  const id = Number(seg);
  if (!seg) {
    return <p className="text-sm text-slate-400">Memuat…</p>;
  }
  if (!Number.isInteger(id) || id <= 0) {
    return <p className="text-sm text-slate-400">Kunjungan tidak ditemukan.</p>;
  }
  return <ConsultView visitId={id} />;
}
