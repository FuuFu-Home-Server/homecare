"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getJson } from "@/lib/fetcher";
import { PrintButton } from "@/components/print/PrintButton";
import { rupiah, tglJamWIB } from "@/lib/format";
import { METODE_LABEL, JAMINAN_META } from "@/lib/status";
import type { ClinicConfig } from "@/lib/config";
import type { Bill, BillItem, Patient, Visit } from "@/types";

interface StrukResponse {
  bill: Bill;
  items: BillItem[];
  visit: Visit;
  patient: Patient;
}

export default function StrukPage() {
  const params = useParams<{ billId: string }>();
  const [data, setData] = useState<StrukResponse | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    void (async () => {
      try {
        const [struk, c] = await Promise.all([
          getJson<StrukResponse>(`/api/bills/${params.billId}`),
          getJson<{ clinic: ClinicConfig }>("/api/clinic"),
        ]);
        setData(struk);
        setClinic(c.clinic);
      } catch {
        setMissing(true);
      }
    })();
  }, [params.billId]);

  if (missing) {
    return <p className="p-8 text-sm text-slate-400">Struk tidak ditemukan.</p>;
  }
  if (!data || !clinic) {
    return <p className="p-8 text-sm text-slate-400">Memuat…</p>;
  }

  const { bill, items, visit, patient } = data;

  return (
    <div className="min-h-dvh bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[80mm] items-center justify-between px-2">
        <Link href="/kasir" className="text-sm text-slate-500 hover:text-slate-700">
          ← Kembali
        </Link>
        <PrintButton label="Cetak Struk" />
      </div>

      <div className="print-sheet mx-auto max-w-[80mm] bg-white p-5 text-[13px] leading-relaxed text-slate-800 shadow-sm print:shadow-none">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-sm font-bold uppercase">{clinic.appTitle || clinic.nama}</h1>
          {clinic.appTitle ? <p className="text-[11px] font-medium text-slate-600">{clinic.nama}</p> : null}
          <p className="text-[11px] text-slate-500">{clinic.alamat}</p>
          <p className="text-[11px] text-slate-500">
            {clinic.kota} · {clinic.telepon}
          </p>
          <p className="text-[11px] text-slate-500">SIPP: {clinic.sipp}</p>
        </div>

        <Divider />

        <div className="space-y-0.5 text-[11px] text-slate-500">
          <Row label="No. Struk" value={`#${String(bill.id).padStart(5, "0")}`} />
          <Row label="Tanggal" value={tglJamWIB(bill.paidAt ?? bill.createdAt)} />
          <Row label="Pasien" value={patient.nama} />
          <Row label="Antrian" value={`#${visit.nomorAntrian}`} />
          <Row label="Jaminan" value={JAMINAN_META[bill.jaminan].label} />
        </div>

        <Divider />

        {/* Items */}
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.id}>
              <p className="text-slate-700">{it.deskripsi}</p>
              <div className="flex justify-between text-[12px] text-slate-500">
                <span className="tabular">
                  {it.qty} × {rupiah(it.hargaSatuan)}
                </span>
                <span className="tabular text-slate-700">{rupiah(it.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        <div className="space-y-0.5 text-[12px]">
          <Row label="Subtotal" value={rupiah(bill.subtotal)} mono />
          {bill.diskon > 0 ? <Row label="Diskon" value={`- ${rupiah(bill.diskon)}`} mono /> : null}
          <div className="flex justify-between pt-1 text-sm font-bold">
            <span>TOTAL</span>
            <span className="tabular">{rupiah(bill.total)}</span>
          </div>
        </div>

        <Divider />

        <div className="space-y-0.5 text-[12px]">
          <Row label={`Bayar (${METODE_LABEL[bill.metode ?? "tunai"]})`} value={rupiah(bill.dibayar ?? bill.total)} mono />
          {bill.metode === "tunai" ? (
            <Row label="Kembalian" value={rupiah(bill.kembalian ?? 0)} mono />
          ) : null}
        </div>

        <Divider />

        <p className="whitespace-pre-line text-center text-[11px] text-slate-500">
          {clinic.strukFooter || "Terima kasih atas kunjungan Anda.\nSemoga lekas sehat."}
        </p>
        {clinic.strukFooter2 ? (
          <p className="mt-1 text-center text-[10px] text-slate-400">{clinic.strukFooter2}</p>
        ) : null}
        <p className="mt-2 text-center text-[10px] text-slate-400">
          {bill.status === "lunas" ? "LUNAS" : "BELUM LUNAS"} · Dicetak {tglJamWIB(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-slate-300" />;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={mono ? "tabular text-slate-700" : "text-slate-700"}>{value}</span>
    </div>
  );
}
