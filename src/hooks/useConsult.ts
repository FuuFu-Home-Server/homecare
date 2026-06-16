"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import type {
  ConsultBundle,
  DispenseResult,
  InterventionKategori,
  MedicineStock,
  PrescriptionInput,
  SoapInput,
} from "@/types";

interface UseConsultResult {
  bundle: ConsultBundle | null;
  medicines: MedicineStock[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveSoap: (input: SoapInput) => Promise<void>;
  addIntervention: (kategori: InterventionKategori, label: string) => Promise<void>;
  removeIntervention: (interventionId: number) => Promise<void>;
  dispense: (items: PrescriptionInput[]) => Promise<DispenseResult>;
  finishConsult: () => Promise<void>;
}

export function useConsult(visitId: number): UseConsultResult {
  const [bundle, setBundle] = useState<ConsultBundle | null>(null);
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const data = await getJson<{ bundle: ConsultBundle }>(`/api/visits/${visitId}/consult`);
      setBundle(data.bundle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat rekam medis.");
    }
  }, [visitId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [consult, meds] = await Promise.all([
          getJson<{ bundle: ConsultBundle }>(`/api/visits/${visitId}/consult`),
          getJson<{ medicines: MedicineStock[] }>("/api/medicines"),
        ]);
        if (!alive) return;
        setBundle(consult.bundle);
        setMedicines(meds.medicines);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Gagal memuat rekam medis.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visitId]);

  const reloadMedicines = useCallback(async (): Promise<void> => {
    const meds = await getJson<{ medicines: MedicineStock[] }>("/api/medicines");
    setMedicines(meds.medicines);
  }, []);

  const saveSoap = useCallback(
    async (input: SoapInput): Promise<void> => {
      await postJson(`/api/visits/${visitId}/soap`, input);
      await refresh();
    },
    [visitId, refresh],
  );

  const addIntervention = useCallback(
    async (kategori: InterventionKategori, label: string): Promise<void> => {
      await postJson(`/api/visits/${visitId}/interventions`, { kategori, label });
      await refresh();
    },
    [visitId, refresh],
  );

  const removeIntervention = useCallback(
    async (interventionId: number): Promise<void> => {
      await deleteJson(`/api/interventions/${interventionId}`);
      await refresh();
    },
    [refresh],
  );

  const dispense = useCallback(
    async (items: PrescriptionInput[]): Promise<DispenseResult> => {
      const res = await postJson<DispenseResult>(`/api/visits/${visitId}/dispense`, { items });
      await Promise.all([refresh(), reloadMedicines()]);
      return res;
    },
    [visitId, refresh, reloadMedicines],
  );

  const finishConsult = useCallback(async (): Promise<void> => {
    await patchJson(`/api/visits/${visitId}`, { status: "diperiksa" });
    await refresh();
  }, [visitId, refresh]);

  return {
    bundle,
    medicines,
    loading,
    error,
    refresh,
    saveSoap,
    addIntervention,
    removeIntervention,
    dispense,
    finishConsult,
  };
}
