"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { getJson } from "@/lib/fetcher";
import { tglWIB, rupiah } from "@/lib/format";
import { ANTRIAN_META } from "@/lib/status";
import { KATEGORI_LABEL, KATEGORI_ORDER } from "@/lib/nursing";
import type { ConsultBundle } from "@/types";

export interface RekamMedisModalProps {
  visitId: number | null;
  onClose: () => void;
}

export function RekamMedisModal({ visitId, onClose }: RekamMedisModalProps) {
  const [bundle, setBundle] = useState<ConsultBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visitId === null) return;
    let alive = true;
    setBundle(null);
    setError(null);
    setLoading(true);
    getJson<{ bundle: ConsultBundle }>(`/api/visits/${visitId}/consult`)
      .then((d) => alive && setBundle(d.bundle))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat rekam medis."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [visitId]);

  const entry = bundle?.entry;

  return (
    <Modal
      open={visitId !== null}
      onClose={onClose}
      title="Rekam Medis"
      description={entry ? `Kunjungan ${tglWIB(entry.tanggal)} · Antrian #${entry.nomorAntrian}` : undefined}
      size="lg"
      footer={
        visitId !== null ? (
          <Link href={`/riwayat/${visitId}`}>
            <Button variant="secondary">Lihat Detail Lengkap →</Button>
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : bundle && entry ? (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={ANTRIAN_META[entry.status].tone}>
              {ANTRIAN_META[entry.status].label}
            </StatusPill>
          </div>

          <Section title="Vitals & Keluhan">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Vital label="Tekanan Darah" value={entry.tdSistol && entry.tdDiastol ? `${entry.tdSistol}/${entry.tdDiastol}` : "—"} />
              <Vital label="Suhu" value={entry.suhu ? `${entry.suhu} °C` : "—"} />
              <Vital label="Berat" value={entry.berat ? `${entry.berat} kg` : "—"} />
              <Vital label="Tinggi" value={entry.tinggi ? `${entry.tinggi} cm` : "—"} />
            </div>
            <p className="mt-2 text-slate-600">
              <span className="text-slate-400">Keluhan utama: </span>
              {entry.keluhanUtama ?? "—"}
            </p>
          </Section>

          <Section title="Catatan SOAP">
            {bundle.soapNotes.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-3">
                {bundle.soapNotes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>{tglWIB(n.createdAt)}</span>
                      {n.amendsId !== null ? (
                        <StatusPill tone="info">Perbaikan</StatusPill>
                      ) : null}
                    </div>
                    <Soap label="S" text={n.subjective} />
                    <Soap label="O" text={n.objective} />
                    <Soap label="A" text={n.assessment} />
                    <Soap label="P" text={n.plan} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Asuhan Keperawatan">
            {bundle.interventions.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {KATEGORI_ORDER.map((k) => {
                  const items = bundle.interventions.filter((i) => i.kategori === k);
                  if (items.length === 0) return null;
                  return (
                    <div key={k}>
                      <p className="text-xs font-semibold text-slate-500">{KATEGORI_LABEL[k]}</p>
                      <p className="text-slate-700">{items.map((i) => i.label).join(", ")}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Resep & Tindakan">
            {bundle.prescriptions.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-slate-100">
                {bundle.prescriptions.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium text-slate-700">{p.nama}</p>
                      <p className="text-xs text-slate-400">{p.aturanPakai ?? "—"}</p>
                    </div>
                    <span className="shrink-0 text-slate-500">
                      {p.qty} {p.satuan} · {rupiah(p.hargaJual * p.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

        </div>
      ) : null}
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

function Soap({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p className="mb-1 flex gap-2">
      <span className="font-semibold text-brand-600">{label}:</span>
      <span className="whitespace-pre-wrap text-slate-600">{text}</span>
    </p>
  );
}

function Empty() {
  return <p className="text-slate-400">Tidak ada data.</p>;
}
