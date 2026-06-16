"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/fetcher";
import type {
  AddBatchInput,
  CreateMedicineInput,
  Medicine,
  MedicineDetailBundle,
  MedicineStock,
} from "@/types";

interface UseInventoryResult {
  medicines: MedicineStock[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMedicine: (input: CreateMedicineInput) => Promise<Medicine>;
}

export function useInventory(): UseInventoryResult {
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<{ medicines: MedicineStock[] }>("/api/medicines");
      setMedicines(data.medicines);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat stok.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMedicine = useCallback(
    async (input: CreateMedicineInput): Promise<Medicine> => {
      const data = await postJson<{ medicine: Medicine }>("/api/medicines", input);
      await refresh();
      return data.medicine;
    },
    [refresh],
  );

  return { medicines, loading, error, refresh, createMedicine };
}

interface UseMedicineResult {
  detail: MedicineDetailBundle | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addBatch: (input: AddBatchInput) => Promise<void>;
  adjust: (batchId: number, delta: number, alasan: string) => Promise<void>;
}

export function useMedicine(medicineId: number): UseMedicineResult {
  const [detail, setDetail] = useState<MedicineDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const data = await getJson<{ detail: MedicineDetailBundle }>(`/api/medicines/${medicineId}`);
      setDetail(data.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat detail obat.");
    }
  }, [medicineId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const addBatch = useCallback(
    async (input: AddBatchInput): Promise<void> => {
      await postJson(`/api/medicines/${medicineId}/batches`, input);
      await refresh();
    },
    [medicineId, refresh],
  );

  const adjust = useCallback(
    async (batchId: number, delta: number, alasan: string): Promise<void> => {
      await postJson(`/api/batches/${batchId}/adjust`, { delta, alasan });
      await refresh();
    },
    [refresh],
  );

  return { detail, loading, error, refresh, addBatch, adjust };
}
