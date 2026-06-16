"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TimePicker } from "@/components/ui/TimePicker";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { IconPlus, IconClose, IconCopy, IconClipboard } from "@/components/layout/icons";
import { getJson, patchJson } from "@/lib/fetcher";
import type { ScheduleDay, ScheduleSession } from "@/types";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

interface EditSession {
  jamBuka: string;
  jamTutup: string;
  isNew: boolean; // true = added this session, not yet persisted
}
interface EditDay {
  day: number;
  sessions: EditSession[];
}

export function ScheduleEditor() {
  const { toast } = useToast();
  const [days, setDays] = useState<EditDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ day: number; idx: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ from: number; sessions: ScheduleSession[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getJson<{ schedule: ScheduleDay[] }>("/api/clinic/schedule");
        setDays(
          data.schedule.map((d) => ({
            day: d.day,
            sessions: d.sessions.map((s) => ({ ...s, isNew: false })),
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat jadwal.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mutate = (day: number, fn: (s: EditSession[]) => EditSession[]): void =>
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, sessions: fn(d.sessions) } : d)));

  const addSession = (day: number): void =>
    mutate(day, (s) => [...s, { jamBuka: "08:00", jamTutup: "12:00", isNew: true }]);
  const drop = (day: number, idx: number): void => mutate(day, (s) => s.filter((_, i) => i !== idx));
  const setTime = (day: number, idx: number, key: "jamBuka" | "jamTutup", v: string): void =>
    mutate(day, (s) => s.map((sess, i) => (i === idx ? { ...sess, [key]: v } : sess)));

  // Confirm only when removing a session that was already saved.
  const requestRemove = (day: number, idx: number, isNew: boolean): void => {
    if (isNew) drop(day, idx);
    else setConfirmTarget({ day, idx });
  };

  const copyDay = (day: number, sessions: EditSession[]): void => {
    setClipboard({ from: day, sessions: sessions.map((s) => ({ jamBuka: s.jamBuka, jamTutup: s.jamTutup })) });
    toast(`Sesi ${HARI[day]} disalin`);
  };
  const pasteDay = (day: number): void => {
    if (!clipboard) return;
    mutate(day, () => clipboard.sessions.map((s) => ({ ...s, isNew: true })));
    toast(`Sesi ditempel ke ${HARI[day]}`);
  };

  const invalid = days.some((d) => d.sessions.some((s) => s.jamTutup <= s.jamBuka));

  async function save(): Promise<void> {
    setError(null);
    if (invalid) return setError("Jam tutup harus setelah jam buka pada setiap sesi.");
    setBusy(true);
    try {
      const payload: ScheduleDay[] = days.map((d) => ({
        day: d.day,
        sessions: d.sessions.map((s) => ({ jamBuka: s.jamBuka, jamTutup: s.jamTutup })),
      }));
      await patchJson("/api/clinic/schedule", { schedule: payload });
      // Everything is now persisted.
      setDays((prev) => prev.map((d) => ({ ...d, sessions: d.sessions.map((s) => ({ ...s, isNew: false })) })));
      toast("Jadwal praktik diperbarui");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Jadwal Praktik"
        subtitle="Setiap hari bisa punya beberapa sesi (mis. pagi & sore). Booking online hanya saat sesi aktif."
      />
      <CardBody className="space-y-3 pt-0">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              {days.map((d) => (
                <div key={d.day} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{HARI[d.day]}</span>
                    <div className="flex items-center gap-3">
                      {d.sessions.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => copyDay(d.day, d.sessions)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
                        >
                          <IconCopy className="h-3.5 w-3.5" /> Salin
                        </button>
                      ) : null}
                      {clipboard && clipboard.from !== d.day ? (
                        <button
                          type="button"
                          onClick={() => pasteDay(d.day)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <IconClipboard className="h-3.5 w-3.5" /> Tempel
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      {d.sessions.length === 0 ? (
                        <span className="inline-block py-1.5 text-sm text-slate-400">Tutup</span>
                      ) : (
                        d.sessions.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <TimePicker value={s.jamBuka} onChange={(v) => setTime(d.day, i, "jamBuka", v)} />
                            <span className="text-slate-400">—</span>
                            <TimePicker
                              value={s.jamTutup}
                              onChange={(v) => setTime(d.day, i, "jamTutup", v)}
                              error={s.jamTutup <= s.jamBuka}
                            />
                            <button
                              type="button"
                              onClick={() => requestRemove(d.day, i, s.isNew)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label="Hapus sesi"
                            >
                              <IconClose className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={() => addSession(d.day)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        <IconPlus className="h-3.5 w-3.5" /> Tambah Sesi
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button onClick={save} loading={busy} disabled={invalid}>
              Simpan Jadwal
            </Button>
          </>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) drop(confirmTarget.day, confirmTarget.idx);
        }}
        title="Hapus Sesi"
        message="Hapus sesi praktik ini? Perubahan baru berlaku setelah jadwal disimpan."
        confirmLabel="Hapus"
      />
    </Card>
  );
}
