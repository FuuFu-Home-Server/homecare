"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { tglJamWIB } from "@/lib/format";
import type { SoapInput, SoapNote } from "@/types";

export interface SoapFormProps {
  notes: SoapNote[];
  onSave: (input: SoapInput) => Promise<void>;
  readOnly?: boolean;
}

interface Draft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const EMPTY: Draft = { subjective: "", objective: "", assessment: "", plan: "" };

export function SoapForm({ notes, onSave, readOnly = false }: SoapFormProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [amendsId, setAmendsId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Draft, v: string): void => setDraft((d) => ({ ...d, [k]: v }));

  function startAmend(note: SoapNote): void {
    setAmendsId(note.id);
    setDraft({
      subjective: note.subjective ?? "",
      objective: note.objective ?? "",
      assessment: note.assessment ?? "",
      plan: note.plan ?? "",
    });
    setError(null);
  }

  async function save(): Promise<void> {
    setError(null);
    if (!draft.subjective && !draft.objective && !draft.assessment && !draft.plan) {
      return setError("Minimal satu bagian SOAP harus diisi.");
    }
    setBusy(true);
    try {
      await onSave({
        subjective: draft.subjective.trim() || null,
        objective: draft.objective.trim() || null,
        assessment: draft.assessment.trim() || null,
        plan: draft.plan.trim() || null,
        amendsId,
      });
      toast(amendsId ? "Amandemen catatan tersimpan" : "Catatan SOAP tersimpan");
      setDraft(EMPTY);
      setAmendsId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  const amendedIds = new Set(notes.map((n) => n.amendsId).filter((id): id is number => id !== null));

  return (
    <Card>
      <CardHeader
        title="Catatan SOAP"
        subtitle="Rekam medis bersifat append-only (Permenkes 24/2022) — koreksi dibuat sebagai amandemen, bukan menimpa."
        action={amendsId ? <StatusPill tone="warning">Mode amandemen</StatusPill> : undefined}
      />
      <CardBody className="space-y-4 pt-0">
        {readOnly ? null : (
          <>
            <div className="space-y-4">
              <Textarea label="S — Subjective" rows={3} value={draft.subjective} onChange={(e) => set("subjective", e.target.value)} placeholder="Keluhan & anamnesis…" />
              <Textarea label="O — Objective" rows={3} value={draft.objective} onChange={(e) => set("objective", e.target.value)} placeholder="Pemeriksaan fisik & vitals…" />
              <Textarea label="A — Assessment" rows={3} value={draft.assessment} onChange={(e) => set("assessment", e.target.value)} placeholder="Penilaian / diagnosis kerja…" />
              <Textarea label="P — Plan" rows={3} value={draft.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Rencana terapi & tindak lanjut…" />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex items-center gap-2">
              <Button onClick={save} loading={busy}>
                {amendsId ? "Simpan Amandemen" : "Simpan Catatan"}
              </Button>
              {amendsId ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAmendsId(null);
                    setDraft(EMPTY);
                  }}
                >
                  Batal
                </Button>
              ) : null}
            </div>
          </>
        )}

        {notes.length > 0 ? (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">Riwayat Catatan ({notes.length})</p>
            {notes.map((n) => {
              const superseded = amendedIds.has(n.id);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    superseded ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white",
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{tglJamWIB(n.createdAt)}</span>
                    {n.amendsId ? <StatusPill tone="warning">Amandemen #{n.amendsId}</StatusPill> : null}
                    {superseded ? <StatusPill tone="neutral">Telah diamandemen</StatusPill> : null}
                  </div>
                  <dl className="space-y-1">
                    <Field label="S" value={n.subjective} />
                    <Field label="O" value={n.objective} />
                    <Field label="A" value={n.assessment} />
                    <Field label="P" value={n.plan} />
                  </dl>
                  {!superseded && !readOnly ? (
                    <button
                      type="button"
                      onClick={() => startAmend(n)}
                      className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Buat amandemen
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="inline font-semibold text-slate-500">{label}: </dt>
      <dd className="inline text-slate-700">{value}</dd>
    </div>
  );
}
