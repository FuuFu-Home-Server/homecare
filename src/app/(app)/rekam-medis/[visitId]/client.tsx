"use client";

import { useParams } from "next/navigation";
import { ConsultView } from "@/components/rekam-medis/ConsultView";

export function ConsultClient() {
  const params = useParams<{ visitId: string }>();
  const id = Number(params.visitId);
  if (!Number.isInteger(id)) {
    return <p className="text-sm text-slate-400">Kunjungan tidak ditemukan.</p>;
  }
  return <ConsultView visitId={id} />;
}
