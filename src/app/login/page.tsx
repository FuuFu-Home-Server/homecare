"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Role } from "@/types";

const QUICK: ReadonlyArray<{ role: Role; label: string; desc: string; username: string }> = [
  { role: "asisten", label: "Asisten", desc: "Registrasi, antrian, kasir", username: "asisten" },
  { role: "perawat", label: "Perawat", desc: "Akses penuh: asuhan keperawatan, resep, laporan", username: "perawat" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(u: string, p: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/login", { username: u, password: p });
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-50 to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
            +
          </div>
          <h1 className="text-lg font-semibold text-slate-800">HomeDoc</h1>
          <p className="text-sm text-slate-500">{CONFIG.clinic.nama}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(username, password);
            }}
            className="space-y-4"
          >
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="asisten / perawat"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              error={error ?? undefined}
            />
            <Button type="submit" loading={busy} className="w-full">
              Masuk
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            masuk cepat (demo)
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <button
                key={q.role}
                type="button"
                disabled={busy}
                onClick={() => submit(q.username, q.username)}
                className="rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
              >
                <span className="block text-sm font-semibold text-slate-800">{q.label}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{q.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">SIPP {CONFIG.clinic.sipp}</p>
      </div>
    </div>
  );
}
