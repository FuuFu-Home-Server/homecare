"use client";

import { useState } from "react";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface LockScreenProps {
  nama: string;
  onUnlock: () => void;
}

export function LockScreen({ nama, onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/unlock", { password });
      setPassword("");
      onUnlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka kunci.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800">Layar Terkunci</h2>
          <p className="text-sm text-slate-500">Masuk kembali sebagai {nama}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            error={error ?? undefined}
          />
          <Button type="submit" loading={busy} className="w-full">
            Buka Kunci
          </Button>
        </form>
      </div>
    </div>
  );
}
