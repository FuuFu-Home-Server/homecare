"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import type { Bill, BillBundle, KasirEntry, MetodeBayar, Treatment } from "@/types";

// ----- Kasir queue (unpaid visits today) -----
interface UseKasirQueueResult {
  queue: KasirEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useKasirQueue(date: string): UseKasirQueueResult {
  const [queue, setQueue] = useState<KasirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<{ queue: KasirEntry[] }>(`/api/kasir?date=${date}`);
      setQueue(data.queue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kasir.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { queue, loading, error, refresh };
}

// ----- Single bill -----
interface UseKasirResult {
  bundle: BillBundle | null;
  treatments: Treatment[];
  loading: boolean;
  error: string | null;
  addTindakan: (treatmentId: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  setDiskon: (diskon: number) => Promise<void>;
  pay: (metode: MetodeBayar, dibayar: number) => Promise<Bill>;
}

export function useKasir(visitId: number): UseKasirResult {
  const [bundle, setBundle] = useState<BillBundle | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const data = await getJson<{ bundle: BillBundle; treatments: Treatment[] }>(
        `/api/visits/${visitId}/bill`,
      );
      setBundle(data.bundle);
      setTreatments(data.treatments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat tagihan.");
    }
  }, [visitId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const billId = bundle?.bill.id;

  const addTindakan = useCallback(
    async (treatmentId: number): Promise<void> => {
      if (!billId) return;
      await postJson(`/api/bills/${billId}/items`, { treatmentId });
      await load();
    },
    [billId, load],
  );

  const removeItem = useCallback(
    async (itemId: number): Promise<void> => {
      if (!billId) return;
      await deleteJson(`/api/bills/${billId}/items/${itemId}`);
      await load();
    },
    [billId, load],
  );

  const setDiskon = useCallback(
    async (diskon: number): Promise<void> => {
      if (!billId) return;
      await patchJson(`/api/bills/${billId}`, { diskon });
      await load();
    },
    [billId, load],
  );

  const pay = useCallback(
    async (metode: MetodeBayar, dibayar: number): Promise<Bill> => {
      if (!billId) throw new Error("Tagihan belum siap.");
      const res = await postJson<{ bill: Bill }>(`/api/bills/${billId}/pay`, { metode, dibayar });
      await load();
      return res.bill;
    },
    [billId, load],
  );

  return { bundle, treatments, loading, error, addTindakan, removeItem, setDiskon, pay };
}
