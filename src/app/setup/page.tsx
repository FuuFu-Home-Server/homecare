"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJson, postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClinicForm {
  nama: string;
  penanggungJawab: string;
  sipp: string;
  alamat: string;
  kota: string;
  telepon: string;
}

const EMPTY_CLINIC: ClinicForm = {
  nama: "",
  penanggungJawab: "",
  sipp: "",
  alamat: "",
  kota: "",
  telepon: "",
};

export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clinic, setClinic] = useState<ClinicForm>(EMPTY_CLINIC);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getJson<{ needsSetup: boolean }>("/api/setup/status")
      .then((s) => (s.needsSetup ? setReady(true) : router.replace("/login")))
      .catch(() => setReady(true));
  }, [router]);

  const setC = (k: keyof ClinicForm, v: string): void => setClinic((c) => ({ ...c, [k]: v }));

  const pwErr = password.length > 0 && password.length < 4 ? "Password minimal 4 karakter." : null;
  const confirmErr = confirm.length > 0 && confirm !== password ? "Konfirmasi tidak cocok." : null;
  const valid =
    /^[a-z0-9_.]{3,}$/.test(username.trim().toLowerCase()) &&
    nama.trim() !== "" &&
    password.length >= 4 &&
    confirm === password &&
    Object.values(clinic).every((v) => v.trim() !== "");

  async function submit(): Promise<void> {
    setError(null);
    if (!valid) return;
    setBusy(true);
    try {
      const res = await postJson<{ recoveryKey: string }>("/api/setup", {
        username,
        nama,
        password,
        clinic,
      });
      setRecoveryKey(res.recoveryKey);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">Memuat…</div>
    );
  }

  if (recoveryKey) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-50 to-brand-50 px-4 py-8">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Simpan Kunci Pemulihan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catat kunci ini di tempat aman. Ini satu-satunya cara membuka data jika password
            perawat terlupa. Kunci tidak akan ditampilkan lagi.
          </p>
          <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm break-all text-slate-800">
            {recoveryKey}
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(recoveryKey).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Tersalin ✓" : "Salin"}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                router.replace("/dashboard");
                router.refresh();
              }}
            >
              Saya sudah menyimpan, lanjut
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-50 to-brand-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">
            +
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Konfigurasi Awal HomeDoc</h1>
          <p className="text-sm text-slate-500">Buat akun perawat (pemilik) dan identitas praktik.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-6"
        >
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Akun Perawat
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              <Input label="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={pwErr ?? undefined} autoComplete="new-password" />
              <Input label="Konfirmasi Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirmErr ?? undefined} autoComplete="new-password" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Identitas Praktik
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nama Praktik" value={clinic.nama} onChange={(e) => setC("nama", e.target.value)} />
              <Input label="Penanggung Jawab" value={clinic.penanggungJawab} onChange={(e) => setC("penanggungJawab", e.target.value)} />
              <Input label="Nomor SIPP" value={clinic.sipp} onChange={(e) => setC("sipp", e.target.value)} />
              <Input label="Kota" value={clinic.kota} onChange={(e) => setC("kota", e.target.value)} />
              <Input label="Telepon" value={clinic.telepon} onChange={(e) => setC("telepon", e.target.value)} />
              <Input label="Alamat" value={clinic.alamat} onChange={(e) => setC("alamat", e.target.value)} />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" loading={busy} disabled={!valid} className="w-full">
            Mulai Gunakan HomeDoc
          </Button>
        </form>
      </div>
    </div>
  );
}
