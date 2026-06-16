"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getJson } from "@/lib/fetcher";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    getJson<{ user: unknown }>("/api/auth/me")
      .then((r) => router.replace(r.user ? "/dashboard" : "/login"))
      .catch(() => router.replace("/login"));
  }, [router]);
  return null;
}
