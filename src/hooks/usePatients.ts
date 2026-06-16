"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import type { CreatePatientInput, Patient } from "@/types";

interface UsePatientsResult {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPatient: (input: CreatePatientInput) => Promise<Patient>;
  updatePatient: (id: number, input: CreatePatientInput) => Promise<Patient>;
  deletePatient: (id: number) => Promise<void>;
}

export function usePatients(): UsePatientsResult {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<{ patients: Patient[] }>("/api/patients");
      setPatients(data.patients);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat pasien.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<Patient> => {
      const data = await postJson<{ patient: Patient }>("/api/patients", input);
      await refresh();
      return data.patient;
    },
    [refresh],
  );

  const updatePatient = useCallback(
    async (id: number, input: CreatePatientInput): Promise<Patient> => {
      const data = await patchJson<{ patient: Patient }>(`/api/patients/${id}`, input);
      await refresh();
      return data.patient;
    },
    [refresh],
  );

  const deletePatient = useCallback(
    async (id: number): Promise<void> => {
      await deleteJson(`/api/patients/${id}`);
      await refresh();
    },
    [refresh],
  );

  return { patients, loading, error, refresh, createPatient, updatePatient, deletePatient };
}
