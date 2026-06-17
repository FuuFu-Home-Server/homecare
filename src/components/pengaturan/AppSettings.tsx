"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { AppPrefs, DisplayMode } from "@/types";

const MODES: { id: DisplayMode; label: string; hint: string }[] = [
  { id: "windowed", label: "Berjendela", hint: "Jendela normal dengan bingkai." },
  { id: "fullscreen", label: "Layar Penuh", hint: "Mengisi seluruh layar." },
  { id: "borderless", label: "Tanpa Bingkai", hint: "Layar penuh tanpa bingkai jendela." },
];

function bridge() {
  return typeof window !== "undefined" ? window.homecare : undefined;
}

export function AppSettings() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<AppPrefs | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bridge()
      ?.getAppPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  async function update(patch: Partial<AppPrefs>): Promise<void> {
    const b = bridge();
    if (!b || !prefs) return;
    setBusy(true);
    // Optimistic: switching to/from "borderless" recreates the window, which
    // reloads this view, so the in-flight call may never resolve here.
    setPrefs({ ...prefs, ...patch });
    try {
      const next = await b.setAppPrefs(patch);
      setPrefs(next);
      toast("Pengaturan aplikasi disimpan");
    } catch {
      /* window may have been recreated — state resets on reload */
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) {
    return (
      <Card>
        <CardHeader title="Tampilan Aplikasi" subtitle="Mode tampilan dan startup" />
        <CardBody className="pt-0 text-sm text-slate-500">Memuat…</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Tampilan Aplikasi" subtitle="Mode tampilan dan startup" />
      <CardBody className="space-y-5 pt-0">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Mode Tampilan</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => {
              const active = prefs.displayMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void update({ displayMode: m.id })}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                    active
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      active ? "text-brand-700" : "text-slate-700",
                    )}
                  >
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="min-w-0 pr-4">
            <p className="text-sm font-medium text-slate-700">Jalankan saat startup</p>
            <p className="text-xs text-slate-400">Buka HomeCare otomatis saat komputer dinyalakan.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.autoLaunch}
            disabled={busy}
            onClick={() => void update({ autoLaunch: !prefs.autoLaunch })}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
              prefs.autoLaunch ? "bg-brand-600" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                prefs.autoLaunch ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
