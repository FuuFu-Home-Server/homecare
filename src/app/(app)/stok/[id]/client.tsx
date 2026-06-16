"use client";

import { useParams } from "next/navigation";
import { StokDetail } from "@/components/stok/StokDetail";

export function StokDetailClient() {
  const params = useParams<{ id: string }>();
  const medicineId = Number(params.id);
  if (!Number.isInteger(medicineId)) {
    return <p className="text-sm text-slate-400">Obat tidak ditemukan.</p>;
  }
  return <StokDetail medicineId={medicineId} />;
}
