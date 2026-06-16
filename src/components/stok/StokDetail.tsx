"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddBatchModal } from "@/components/stok/AddBatchModal";
import { AdjustStockModal } from "@/components/stok/AdjustStockModal";
import { IconPlus } from "@/components/layout/icons";
import { useMedicine } from "@/hooks/useInventory";
import { CONFIG } from "@/lib/config";
import { rupiah, tglWIB, tglJamWIB, daysUntil } from "@/lib/format";
import type { MedicineBatch, StockTipe } from "@/types";

const TIPE_META: Record<StockTipe, { label: string; tone: "success" | "danger" | "warning" }> = {
  masuk: { label: "Masuk", tone: "success" },
  keluar: { label: "Keluar", tone: "danger" },
  penyesuaian: { label: "Penyesuaian", tone: "warning" },
};

export interface StokDetailProps {
  medicineId: number;
}

export function StokDetail({ medicineId }: StokDetailProps) {
  const router = useRouter();
  const { detail, loading, error, addBatch, adjust } = useMedicine(medicineId);
  const [addOpen, setAddOpen] = useState(false);
  const [adjustBatchRow, setAdjustBatchRow] = useState<MedicineBatch | null>(null);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !detail) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error ?? "Obat tidak ditemukan."}</p>
          <Button variant="secondary" className="mt-3" onClick={() => router.push("/stok")}>
            Kembali
          </Button>
        </CardBody>
      </Card>
    );
  }

  const { medicine, batches, movements } = detail;

  return (
    <>
      <PageHeader
        title={medicine.nama}
        description={medicine.merek ?? medicine.satuan}
        action={
          <>
            <Button variant="secondary" onClick={() => router.push("/stok")}>
              Kembali
            </Button>
            <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Stok Masuk
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Informasi" />
          <CardBody className="space-y-2 pt-0 text-sm">
            <Row label="Bentuk">{medicine.bentuk}</Row>
            <Row label="Satuan">{medicine.satuan}</Row>
            <Row label="Harga Jual">{rupiah(medicine.hargaJual)}</Row>
            <Row label="Supplier">{medicine.supplier ?? "—"}</Row>
            <Row label="Total Stok">
              <span className="inline-flex items-center gap-2">
                {medicine.totalQty} {medicine.satuan}
                {medicine.totalQty <= CONFIG.lowStockThreshold ? (
                  <StatusPill tone="warning">menipis</StatusPill>
                ) : null}
              </span>
            </Row>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {medicine.obatKeras ? <StatusPill tone="danger">Obat Keras</StatusPill> : null}
              {medicine.isConsumable ? <StatusPill tone="neutral">BMHP</StatusPill> : null}
            </div>
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Batch & Kadaluarsa" subtitle="Urut FEFO — kadaluarsa terdekat di atas" />
            <CardBody className="pt-0">
              {batches.length === 0 ? (
                <EmptyState title="Belum ada batch" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500">
                        <th className="px-2 py-2 text-left font-semibold">Batch</th>
                        <th className="px-2 py-2 text-left font-semibold">Kadaluarsa</th>
                        <th className="px-2 py-2 text-right font-semibold">Stok</th>
                        <th className="px-2 py-2 text-right font-semibold">Beli</th>
                        <th className="w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => {
                        const sisa = daysUntil(b.tglKadaluarsa);
                        return (
                          <tr key={b.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-2 py-2.5 text-slate-700">{b.noBatch}</td>
                            <td className="px-2 py-2.5">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-slate-600">{tglWIB(b.tglKadaluarsa)}</span>
                                {sisa <= CONFIG.nearExpiryDays ? (
                                  <StatusPill tone={sisa <= 30 ? "danger" : "warning"}>
                                    {sisa <= 0 ? "exp" : `${sisa}h`}
                                  </StatusPill>
                                ) : null}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-right tabular text-slate-700">{b.qty}</td>
                            <td className="px-2 py-2.5 text-right tabular text-slate-500">
                              {b.hargaBeli != null ? rupiah(b.hargaBeli) : "—"}
                            </td>
                            <td className="px-2 py-2.5 text-right">
                              <Button size="sm" variant="ghost" onClick={() => setAdjustBatchRow(b)}>
                                Sesuaikan
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Riwayat Pergerakan Stok" subtitle="Jejak audit masuk / keluar / penyesuaian" />
            <CardBody className="pt-0">
              {movements.length === 0 ? (
                <EmptyState title="Belum ada pergerakan" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <StatusPill tone={TIPE_META[m.tipe].tone}>{TIPE_META[m.tipe].label}</StatusPill>
                        <span className="text-slate-600">
                          {m.noBatch}
                          {m.alasan ? ` · ${m.alasan}` : ""}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`tabular font-medium ${m.qty < 0 ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {m.qty > 0 ? "+" : ""}
                          {m.qty}
                        </span>
                        <span className="ml-3 text-xs text-slate-400">{tglJamWIB(m.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <AddBatchModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={addBatch} />
      <AdjustStockModal
        open={adjustBatchRow !== null}
        onClose={() => setAdjustBatchRow(null)}
        batch={adjustBatchRow}
        onSubmit={adjust}
      />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700">{children}</span>
    </div>
  );
}
