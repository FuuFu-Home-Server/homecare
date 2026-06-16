"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson } from "@/lib/fetcher";
import type {
  ClinicalReport,
  ExpenseRow,
  FinancialReport,
  InventoryReport,
  TransactionRow,
} from "@/types";

export interface ReportsBundle {
  month: string;
  financial: FinancialReport;
  clinical: ClinicalReport;
  inventory: InventoryReport;
  transactions: TransactionRow[];
  expenses: ExpenseRow[];
}

interface UseReportsResult {
  data: ReportsBundle | null;
  loading: boolean;
  error: string | null;
}

export function useReports(month: string): UseReportsResult {
  const [data, setData] = useState<ReportsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<ReportsBundle>(`/api/reports?month=${month}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error };
}
