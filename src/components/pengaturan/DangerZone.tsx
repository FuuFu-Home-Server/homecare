"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { postJson } from "@/lib/fetcher";

interface DangerAction {
  id: string;
  title: string;
  desc: string;
  phrase: string;
  button: string;
}

const ACTIONS: DangerAction[] = [
  {
    id: "clear-transactions",
    title: "Hapus Semua Transaksi",
    desc: "Menghapus seluruh tagihan, pembayaran, pengeluaran, dan penggajian. Data pasien, rekam medis, dan stok tetap.",
    phrase: "HAPUS TRANSAKSI",
    button: "Hapus Transaksi",
  },
  {
    id: "delete-patients",
    title: "Hapus Semua Pasien",
    desc: "Menghapus seluruh pasien beserta kunjungan, rekam medis, dan tagihan terkait. Stok dan akun staf tetap.",
    phrase: "HAPUS PASIEN",
    button: "Hapus Pasien",
  },
  {
    id: "restore-settings",
    title: "Reset Pengaturan",
    desc: "Mengembalikan profil praktik dan jadwal ke pengaturan bawaan. Tidak menghapus data operasional.",
    phrase: "RESET PENGATURAN",
    button: "Reset Pengaturan",
  },
  {
    id: "factory-reset",
    title: "Reset Total (Factory Reset)",
    desc: "Menghapus SELURUH data termasuk akun staf dan kunci enkripsi. Aplikasi kembali ke layar setup awal. Tidak dapat dipulihkan.",
    phrase: "RESET TOTAL",
    button: "Reset Total",
  },
];

export function DangerZone() {
  const { toast } = useToast();
  const [active, setActive] = useState<DangerAction | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(action: DangerAction): void {
    setActive(action);
    setConfirm("");
    setError(null);
  }

  async function run(): Promise<void> {
    if (!active) return;
    setError(null);
    setBusy(true);
    try {
      const res = await postJson<{ reset?: boolean }>("/api/admin/danger", {
        action: active.id,
        confirm: confirm.trim(),
      });
      if (res.reset) {
        // Files removed — bounce to a fresh load so the setup wizard takes over.
        window.location.href = "/";
        return;
      }
      toast(`${active.title} selesai`);
      setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menjalankan aksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader
          title="Zona Berbahaya"
          subtitle="Aksi di bawah menghapus data secara permanen. Cadangan otomatis dibuat sebelum eksekusi (kecuali Reset Total)."
        />
        <CardBody className="space-y-3 pt-0">
          {ACTIONS.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 rounded-lg border border-red-100 bg-red-50/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500">{a.desc}</p>
              </div>
              <Button variant="danger" className="shrink-0" onClick={() => open(a)}>
                {a.button}
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <Modal
        open={active !== null}
        onClose={() => (busy ? undefined : setActive(null))}
        title={active?.title ?? ""}
        description="Aksi ini tidak dapat dibatalkan."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActive(null)} disabled={busy}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={run}
              loading={busy}
              disabled={confirm.trim() !== active?.phrase}
            >
              {active?.button}
            </Button>
          </>
        }
      >
        {active ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{active.desc}</p>
            <Input
              label={`Ketik "${active.phrase}" untuk konfirmasi`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={active.phrase}
              error={error ?? undefined}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
