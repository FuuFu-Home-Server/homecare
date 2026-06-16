"use client";

import { useParams } from "next/navigation";
import { BillView } from "@/components/kasir/BillView";

export function KasirBillClient() {
  const params = useParams<{ visitId: string }>();
  const id = Number(params.visitId);
  if (!Number.isInteger(id)) {
    return <p className="text-sm text-slate-400">Kunjungan tidak ditemukan.</p>;
  }
  return <BillView visitId={id} />;
}
