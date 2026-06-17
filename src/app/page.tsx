"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJson } from "@/lib/fetcher";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    getJson<{ needsSetup: boolean }>("/api/setup/status")
      .then((s) => {
        if (s.needsSetup) {
          router.replace("/setup");
          return;
        }
        return getJson<{ user: unknown }>("/api/auth/me").then((r) =>
          router.replace(r.user ? "/dashboard" : "/login"),
        );
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  return null;
}
