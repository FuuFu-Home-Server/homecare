"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJson } from "@/lib/fetcher";
import { AuthProvider } from "@/hooks/useAuth";
import { ClinicProvider } from "@/hooks/useClinic";
import { AppShell } from "@/components/layout/AppShell";
import type { AuthUser } from "@/hooks/useAuth";
import type { ClinicConfig } from "@/lib/config";
import type { Role } from "@/types";

interface MeUser {
  userId?: number;
  username?: string;
  nama?: string;
  role?: Role;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [me, c] = await Promise.all([
          getJson<{ user: MeUser | null }>("/api/auth/me"),
          getJson<{ clinic: ClinicConfig }>("/api/clinic"),
        ]);
        if (!active) return;
        const u = me.user;
        if (!u || u.userId === undefined || u.role === undefined) {
          router.replace("/login");
          return;
        }
        setUser({
          userId: u.userId,
          username: u.username ?? "",
          nama: u.nama ?? "",
          role: u.role,
        });
        setClinic(c.clinic);
      } catch {
        if (active) router.replace("/login");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready || !user || !clinic) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
        Memuat…
      </div>
    );
  }

  return (
    <AuthProvider initialUser={user}>
      <ClinicProvider clinic={clinic}>
        <AppShell>{children}</AppShell>
      </ClinicProvider>
    </AuthProvider>
  );
}
