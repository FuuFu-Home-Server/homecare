"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { getJson, postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recover, setRecover] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ needsSetup: boolean }>("/api/setup/status")
      .then((s) => {
        if (s.needsSetup) router.replace("/setup");
      })
      .catch(() => undefined);
  }, [router]);

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

  async function submitRecover(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/recover", { username, recoveryKey, password });
      setRecover(false);
      setRecoveryKey("");
      setPassword("");
      setNotice("Password berhasil diatur ulang. Silakan masuk.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulihkan.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-50 to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
            +
          </div>
          <h1 className="text-lg font-semibold text-slate-800">HomeCare</h1>
          <p className="text-sm text-slate-500">{CONFIG.clinic.nama}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {notice ? <p className="mb-4 text-sm text-emerald-600">{notice}</p> : null}
          {recover ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitRecover();
              }}
              className="space-y-4"
            >
              <p className="text-sm text-slate-500">
                Masukkan username, kunci pemulihan, dan password baru.
              </p>
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <Input
                label="Kunci Pemulihan"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
              />
              <Input
                label="Password Baru"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                error={error ?? undefined}
              />
              <Button type="submit" loading={busy} className="w-full">
                Atur Ulang Password
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setRecover(false);
                  setError(null);
                }}
              >
                Kembali ke masuk
              </button>
            </form>
          ) : (
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
              <button
                type="button"
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setRecover(true);
                  setError(null);
                  setNotice(null);
                }}
              >
                Lupa password?
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">SIPP {CONFIG.clinic.sipp}</p>
      </div>
    </div>
  );
}
