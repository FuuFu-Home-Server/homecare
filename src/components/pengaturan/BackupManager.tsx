"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getJson, postJson } from "@/lib/fetcher";
import { tglJamWIB } from "@/lib/format";

interface BackupInfo {
  name: string;
  size: number;
  createdAt: string;
}

interface BackupList {
  backups: BackupInfo[];
  last: BackupInfo | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupManager() {
  const { toast } = useToast();
  const [data, setData] = useState<BackupList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = (): void => {
    getJson<BackupList>("/api/backup")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat cadangan."));
  };

  useEffect(refresh, []);

  async function backupNow(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/backup", {});
      toast("Cadangan dibuat");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat cadangan.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(name: string): Promise<void> {
    if (!window.confirm(`Pulihkan data dari ${name}? Data saat ini akan diganti (dicadangkan dulu).`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/backup/restore", { name });
      toast("Data dipulihkan — memuat ulang…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulihkan.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Cadangan Data" subtitle="Cadangan lokal otomatis harian + manual" />
      <CardBody className="space-y-4 pt-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Cadangan terakhir:{" "}
            <span className="font-medium text-slate-700">
              {data?.last ? tglJamWIB(data.last.createdAt) : "belum ada"}
            </span>
          </p>
          <Button onClick={backupNow} loading={busy}>
            Backup Sekarang
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {data && data.backups.length > 0 ? (
            data.backups.map((b) => (
              <div key={b.name} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">{tglJamWIB(b.createdAt)}</p>
                  <p className="text-xs text-slate-400">
                    {b.name} · {formatSize(b.size)}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => restore(b.name)} disabled={busy}>
                  Pulihkan
                </Button>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-slate-400">Belum ada cadangan.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
