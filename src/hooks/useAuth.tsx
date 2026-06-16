"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/fetcher";
import type { Role } from "@/types";

export interface AuthUser {
  userId: number;
  username: string;
  nama: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser;
  busy: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

export interface AuthProviderProps {
  initialUser: AuthUser;
  children: ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout(): Promise<void> {
    setBusy(true);
    try {
      await postJson("/api/auth/logout", {});
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user: initialUser, busy, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
