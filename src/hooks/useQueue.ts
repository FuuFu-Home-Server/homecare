"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, patchJson } from "@/lib/fetcher";
import type { AntrianStatus, QueueEntry, Visit, VitalsInput } from "@/types";

type Scope = "asisten" | "perawat" | "riwayat";

interface UseQueueResult {
  queue: QueueEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBooking: (patientId: number, keluhan: string | null) => Promise<Visit>;
  saveVitals: (visitId: number, vitals: VitalsInput) => Promise<void>;
  setStatus: (visitId: number, status: AntrianStatus) => Promise<void>;
}

export function useQueue(date: string, scope: Scope = "asisten"): UseQueueResult {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date });
      if (scope !== "asisten") qs.set("scope", scope);
      const data = await getJson<{ queue: QueueEntry[] }>(`/api/visits?${qs.toString()}`);
      setQueue(data.queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat antrian.");
    } finally {
      setLoading(false);
    }
  }, [date, scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBooking = useCallback(
    async (patientId: number, keluhan: string | null): Promise<Visit> => {
      const data = await postJson<{ visit: Visit }>("/api/visits", { patientId, keluhan });
      await refresh();
      return data.visit;
    },
    [refresh],
  );

  const saveVitals = useCallback(
    async (visitId: number, vitals: VitalsInput): Promise<void> => {
      await postJson(`/api/visits/${visitId}/vitals`, vitals);
      await refresh();
    },
    [refresh],
  );

  const setStatus = useCallback(
    async (visitId: number, status: AntrianStatus): Promise<void> => {
      await patchJson(`/api/visits/${visitId}`, { status });
      await refresh();
    },
    [refresh],
  );

  return { queue, loading, error, refresh, createBooking, saveVitals, setStatus };
}
