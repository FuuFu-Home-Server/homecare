"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { StaffManager } from "@/components/pengaturan/StaffManager";
import { ScheduleEditor } from "@/components/pengaturan/ScheduleEditor";
import { BackupManager } from "@/components/pengaturan/BackupManager";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { patchJson } from "@/lib/fetcher";
import { cn } from "@/lib/cn";
import type { ClinicConfig } from "@/lib/config";

type Tab = "klinik" | "jadwal" | "akun" | "staf" | "cadangan";

export function SettingsView() {
  const { user } = useAuth();
  const tabs: { id: Tab; label: string }[] = [
    { id: "klinik", label: "Profil Praktik" },
    { id: "jadwal", label: "Jadwal Praktik" },
    { id: "akun", label: "Akun Saya" },
    ...(user.role === "perawat"
      ? [
          { id: "staf" as const, label: "Manajemen Staf" },
          { id: "cadangan" as const, label: "Cadangan Data" },
        ]
      : []),
  ];
  const [tab, setTab] = useState<Tab>("klinik");

  return (
    <>
      <PageHeader title="Pengaturan" description="Profil praktik, akun, dan staf" />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "klinik" ? <ClinicForm /> : null}
      {tab === "jadwal" ? <ScheduleEditor /> : null}
      {tab === "akun" ? <AccountForm initialNama={user.nama} /> : null}
      {tab === "staf" && user.role === "perawat" ? <StaffManager currentUserId={user.userId} /> : null}
      {tab === "cadangan" && user.role === "perawat" ? <BackupManager /> : null}
    </>
  );
}

function ClinicForm() {
  const router = useRouter();
  const { toast } = useToast();
  const clinic = useClinic();
  const [form, setForm] = useState<ClinicConfig>(clinic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof ClinicConfig, v: string): void => setForm((f) => ({ ...f, [k]: v }));
  const req = (v: string): string | undefined => (v.trim() === "" ? "Wajib diisi." : undefined);
  const valid = [form.nama, form.penanggungJawab, form.sipp, form.alamat, form.kota, form.telepon].every(
    (v) => v.trim() !== "",
  );

  async function save(): Promise<void> {
    setError(null);
    if (!valid) return;
    setBusy(true);
    try {
      await patchJson("/api/clinic", form);
      toast("Profil praktik diperbarui");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profil Praktik" subtitle="Tampil di dashboard dan struk" />
      <CardBody className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nama Praktik" value={form.nama} onChange={(e) => set("nama", e.target.value)} error={req(form.nama)} />
          <Input label="Perawat Penanggung Jawab" value={form.penanggungJawab} onChange={(e) => set("penanggungJawab", e.target.value)} error={req(form.penanggungJawab)} />
          <Input label="Nomor SIPP" value={form.sipp} onChange={(e) => set("sipp", e.target.value)} error={req(form.sipp)} />
          <Input label="Kota" value={form.kota} onChange={(e) => set("kota", e.target.value)} error={req(form.kota)} />
          <Input label="Telepon" value={form.telepon} onChange={(e) => set("telepon", e.target.value)} error={req(form.telepon)} />
          <Input label="Alamat" value={form.alamat} onChange={(e) => set("alamat", e.target.value)} error={req(form.alamat)} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold text-slate-500">Tampilan Aplikasi &amp; Struk</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Judul Aplikasi"
              value={form.appTitle}
              onChange={(e) => set("appTitle", e.target.value)}
              hint="Tampil di sidebar dan judul struk."
            />
            <Input
              label="Catatan Struk"
              value={form.strukFooter}
              onChange={(e) => set("strukFooter", e.target.value)}
              hint="Pesan penutup pada struk."
            />
            <div className="sm:col-span-2">
              <Input
                label="Baris Tambahan Struk (opsional)"
                value={form.strukFooter2}
                onChange={(e) => set("strukFooter2", e.target.value)}
              />
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={save} loading={busy} disabled={!valid}>
          Simpan Perubahan
        </Button>
      </CardBody>
    </Card>
  );
}

function AccountForm({ initialNama }: { initialNama: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [nama, setNama] = useState(initialNama);
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live validation — errors recompute on every keystroke.
  const wantPw = password.length > 0 || oldPassword.length > 0 || confirm.length > 0;
  const namaErr = !nama.trim() ? "Nama wajib diisi." : null;
  const oldErr = wantPw && !oldPassword ? "Masukkan password lama." : null;
  const pwErr = wantPw && password.length < 4 ? "Password baru minimal 4 karakter." : null;
  const confirmErr = wantPw && confirm !== password ? "Konfirmasi tidak cocok." : null;
  const valid = !namaErr && !oldErr && !pwErr && !confirmErr;

  async function save(): Promise<void> {
    setError(null);
    if (!valid) return;
    setBusy(true);
    try {
      await patchJson("/api/account", {
        nama: nama.trim(),
        oldPassword: wantPw ? oldPassword : undefined,
        password: wantPw ? password : undefined,
      });
      toast("Akun diperbarui");
      setOldPassword("");
      setPassword("");
      setConfirm("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Akun Saya" subtitle="Perbarui nama tampilan dan password" />
      <CardBody className="space-y-4 pt-0">
        <Input
          label="Nama"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          error={namaErr ?? undefined}
        />
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold text-slate-500">Ganti Password (opsional)</p>
          <div className="space-y-3">
            <PasswordInput
              label="Password Lama"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              error={oldErr ?? undefined}
            />
            <PasswordInput
              label="Password Baru"
              meter={wantPw}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={pwErr ?? undefined}
              hint={!wantPw ? "Kosongkan jika tidak ingin mengganti password." : undefined}
            />
            <PasswordInput
              label="Konfirmasi Password Baru"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirmErr ?? undefined}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={save} loading={busy} disabled={!valid}>
          Simpan
        </Button>
      </CardBody>
    </Card>
  );
}
