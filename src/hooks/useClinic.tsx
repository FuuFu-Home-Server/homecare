"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ClinicConfig } from "@/lib/config";

const ClinicContext = createContext<ClinicConfig | null>(null);

export function useClinic(): ClinicConfig {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic harus dipakai di dalam <ClinicProvider>");
  return ctx;
}

export interface ClinicProviderProps {
  clinic: ClinicConfig;
  children: ReactNode;
}

export function ClinicProvider({ clinic, children }: ClinicProviderProps) {
  return <ClinicContext.Provider value={clinic}>{children}</ClinicContext.Provider>;
}
