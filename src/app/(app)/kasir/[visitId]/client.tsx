"use client";

import { useDynamicSegment } from "@/hooks/useRouteParam";
import { BillView } from "@/components/kasir/BillView";

export function KasirBillClient() {
  const id = Number(useDynamicSegment());
  if (!Number.isInteger(id)) {
    return <p className="text-sm text-slate-400">Kunjungan tidak ditemukan.</p>;
  }
  return <BillView visitId={id} />;
}
