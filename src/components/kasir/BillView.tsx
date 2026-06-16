"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Combobox } from "@/components/ui/Combobox";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { IconClose, IconPrint } from "@/components/layout/icons";
import { useKasir } from "@/hooks/useKasir";
import { rupiah, umur, formatThousands } from "@/lib/format";
import { JAMINAN_META, METODE_LABEL } from "@/lib/status";
import type { BillItemTipe, MetodeBayar, Treatment } from "@/types";

const TIPE_LABEL: Record<BillItemTipe, string> = {
  konsultasi: "Konsultasi",
  obat: "Obat",
  tindakan: "Tindakan",
};

const TIPE_TONE: Record<BillItemTipe, "brand" | "info" | "neutral"> = {
  konsultasi: "brand",
  obat: "info",
  tindakan: "neutral",
};

export interface BillViewProps {
  visitId: number;
}

export function BillView({ visitId }: BillViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { bundle, treatments, loading, error, addTindakan, removeItem, setDiskon, pay } =
    useKasir(visitId);

  const [metode, setMetode] = useState<MetodeBayar>("tunai");
  const [dibayar, setDibayar] = useState("");
  const [diskonInput, setDiskonInput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paidId, setPaidId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !bundle) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">{error ?? "Tagihan tidak ditemukan."}</p>
          <Button variant="secondary" className="mt-3" onClick={() => router.push("/kasir")}>
            Kembali
          </Button>
        </CardBody>
      </Card>
    );
  }

  const { bill, items, entry, patient } = bundle;
  const isPaid = bill.status === "lunas" || paidId !== null;
  const total = bill.total;
  const bayarNum = Number(dibayar) || 0;
  const kembalian = metode === "tunai" ? Math.max(0, bayarNum - total) : 0;
  const diskonValue = diskonInput === null ? String(bill.diskon || "") : diskonInput;

  async function commitDiskon(): Promise<void> {
    const v = Number(diskonInput) || 0;
    await setDiskon(v);
    setDiskonInput(null);
  }

  async function handlePay(): Promise<void> {
    if (metode === "tunai" && bayarNum < total) {
      toast("Nominal pembayaran kurang dari total", "error");
      return;
    }
    setBusy(true);
    try {
      const paid = await pay(metode, metode === "tunai" ? bayarNum : total);
      setPaidId(paid.id);
      toast("Pembayaran berhasil — tagihan lunas");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memproses pembayaran", "error");
    } finally {
      setBusy(false);
    }
  }

  const billId = paidId ?? bill.id;

  return (
    <>
      <PageHeader
        title={`Pembayaran — ${patient.nama}`}
        description={`Antrian #${entry.nomorAntrian} · ${umur(patient.tglLahir)} th`}
        action={
          <Button variant="secondary" onClick={() => router.push("/kasir")}>
            Kembali
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Rincian tagihan */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Rincian Tagihan"
            subtitle="Konsultasi & obat terisi otomatis"
          />
          <CardBody className="space-y-4 pt-0">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga</th>
                    <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <StatusPill tone={TIPE_TONE[it.tipe]}>{TIPE_LABEL[it.tipe]}</StatusPill>
                          <span className="text-slate-700">{it.deskripsi}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-600">{it.qty}</td>
                      <td className="px-3 py-2.5 text-right tabular text-slate-600">
                        {rupiah(it.hargaSatuan)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular font-medium text-slate-800">
                        {rupiah(it.subtotal)}
                      </td>
                      <td className="px-2">
                        {it.tipe === "tindakan" && !isPaid ? (
                          <button
                            type="button"
                            onClick={() => removeItem(it.id)}
                            className="text-slate-400 hover:text-red-600"
                            aria-label="Hapus tindakan"
                          >
                            <IconClose className="h-4 w-4" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isPaid ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600">Tambah Tindakan</p>
                <Combobox
                  options={treatments}
                  value={null}
                  onChange={(t: Treatment) => addTindakan(t.id)}
                  getKey={(t) => t.id}
                  getLabel={(t) => t.nama}
                  getSublabel={(t) => rupiah(t.harga)}
                  placeholder="Cari tindakan untuk ditambahkan…"
                  emptyText="Tindakan tidak ditemukan"
                  clearOnSelect
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Pembayaran */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pembayaran"
              action={
                <StatusPill tone={JAMINAN_META[bill.jaminan].tone}>
                  {JAMINAN_META[bill.jaminan].label}
                </StatusPill>
              }
            />
            <CardBody className="space-y-3 pt-0">
              {bill.jaminan === "bpjs" ? (
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                  Pasien BPJS — penjaminan diproses terpisah (simulasi demo).
                </p>
              ) : null}

              <div className="space-y-1.5 text-sm">
                <Line label="Subtotal" value={rupiah(bill.subtotal)} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Diskon</span>
                  {isPaid ? (
                    <span className="tabular text-slate-700">{rupiah(bill.diskon)}</span>
                  ) : (
                    <input
                      inputMode="numeric"
                      value={formatThousands(diskonValue)}
                      onChange={(e) => setDiskonInput(e.target.value.replace(/\D/g, ""))}
                      onBlur={commitDiskon}
                      placeholder="0"
                      className="h-8 w-28 rounded-lg border border-slate-300 px-2 text-right text-sm tabular focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-semibold">
                  <span className="text-slate-600">Total</span>
                  <span className="tabular text-brand-700">{rupiah(total)}</span>
                </div>
              </div>

              {isPaid ? (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    <p className="font-semibold">Lunas · {METODE_LABEL[bill.metode ?? "tunai"]}</p>
                    {bill.metode === "tunai" && bill.dibayar != null ? (
                      <p className="mt-0.5 text-xs">
                        Dibayar {rupiah(bill.dibayar)} · Kembalian {rupiah(bill.kembalian ?? 0)}
                      </p>
                    ) : null}
                  </div>
                  <Link href={`/print/struk/${billId}`} target="_blank" className="block">
                    <Button leftIcon={<IconPrint className="h-4 w-4" />} className="w-full">
                      Cetak Struk
                    </Button>
                  </Link>
                  <Button variant="secondary" className="w-full" onClick={() => router.push("/kasir")}>
                    Selesai
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-600">Metode Pembayaran</p>
                    <CustomSelect
                      value={metode}
                      onChange={(v) => setMetode(v === "transfer" ? "transfer" : v === "qris" ? "qris" : "tunai")}
                      options={[
                        { value: "tunai", label: "Tunai" },
                        { value: "transfer", label: "Transfer" },
                        { value: "qris", label: "QRIS" },
                      ]}
                    />
                  </div>

                  {metode === "tunai" ? (
                    <>
                      <Input
                        label="Uang Diterima"
                        inputMode="numeric"
                        value={formatThousands(dibayar)}
                        onChange={(e) => setDibayar(e.target.value.replace(/\D/g, ""))}
                        placeholder={formatThousands(total)}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setDibayar(String(total))}>
                          Uang Pas
                        </Button>
                        {[50000, 100000].map((n) =>
                          n >= total ? (
                            <Button key={n} size="sm" variant="secondary" onClick={() => setDibayar(String(n))}>
                              {rupiah(n)}
                            </Button>
                          ) : null,
                        )}
                      </div>
                      <Line label="Kembalian" value={rupiah(kembalian)} />
                    </>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      {metode === "qris" ? "Tampilkan QRIS ke pasien (simulasi)." : "Konfirmasi transfer diterima."}
                    </p>
                  )}

                  <Button onClick={handlePay} loading={busy} className="w-full">
                    Bayar {rupiah(total)}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="tabular text-slate-700">{value}</span>
    </div>
  );
}
