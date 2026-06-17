"use client";

import { useEffect, useState } from "react";
import { useDynamicSegment } from "@/hooks/useRouteParam";
import { getJson } from "@/lib/fetcher";
import { PatientDetail } from "@/components/pasien/PatientDetail";
import type { Patient, PatientHistoryItem } from "@/types";

interface PatientDetailResponse {
  patient: Patient;
  history: PatientHistoryItem[];
}

export function PatientDetailClient() {
  const id = useDynamicSegment();
  const [data, setData] = useState<PatientDetailResponse | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    getJson<PatientDetailResponse>(`/api/patients/${id}`)
      .then(setData)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return <p className="text-sm text-slate-400">Pasien tidak ditemukan.</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-400">Memuat…</p>;
  }

  return <PatientDetail patient={data.patient} history={data.history} />;
}
