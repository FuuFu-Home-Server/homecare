"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconDownload } from "@/components/layout/icons";
import { getJson } from "@/lib/fetcher";
import { saveDocumentPdf } from "@/lib/print";
import { pdfFileName } from "@/lib/filename";
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

export interface StrukModalProps {
  open: boolean;
  onClose: () => void;
  billId: number;
}

export function StrukModal({ open, onClose, billId }: StrukModalProps) {
  const [data, setData] = useState<StrukResponse | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function downloadPdf(): Promise<void> {
    if (!data) return;
    setSaving(true);
    document.body.classList.add("struk-printing");
    try {
      const tanggal = (data.bill.paidAt ?? data.bill.createdAt).slice(0, 10);
      await saveDocumentPdf(
        pdfFileName("struk", String(data.bill.id).padStart(5, "0"), data.patient.nama, tanggal),
      );
    } finally {
      document.body.classList.remove("struk-printing");
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setData(null);
    setMissing(false);
    void (async () => {
      try {
        const [struk, c] = await Promise.all([
          getJson<StrukResponse>(`/api/bills/${billId}`),
          getJson<{ clinic: ClinicConfig }>("/api/clinic"),
        ]);
        setData(struk);
        setClinic(c.clinic);
      } catch {
        setMissing(true);
      }
    })();
  }, [open, billId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Struk Pembayaran"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          <Button
            leftIcon={<IconDownload className="h-4 w-4" />}
            onClick={downloadPdf}
            loading={saving}
            disabled={!data}
          >
            Unduh PDF
          </Button>
        </>
      }
    >
      {missing ? (
        <p className="text-sm text-slate-400">Struk tidak ditemukan.</p>
      ) : !data || !clinic ? (
        <p className="text-sm text-slate-400">Memuat…</p>
      ) : (
        <Receipt {...data} clinic={clinic} />
      )}
    </Modal>
  );
}

function Receipt({ bill, items, visit, patient, clinic }: StrukResponse & { clinic: ClinicConfig }) {
  return (
    <div className="struk-print-region mx-auto max-w-[80mm] rounded-lg border border-slate-200 bg-white p-5 text-[13px] leading-relaxed text-slate-800">
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
        {bill.metode === "tunai" ? <Row label="Kembalian" value={rupiah(bill.kembalian ?? 0)} mono /> : null}
      </div>

      <Divider />

      <p className="whitespace-pre-line text-center text-[11px] text-slate-500">
        {clinic.strukFooter || "Terima kasih atas kunjungan Anda.\nSemoga lekas sehat."}
      </p>
      {clinic.strukFooter2 ? (
        <p className="mt-1 text-center text-[10px] text-slate-400">{clinic.strukFooter2}</p>
      ) : null}
      <p className="mt-2 text-center text-[10px] text-slate-400">
        {bill.status === "lunas" ? "LUNAS" : "BELUM LUNAS"}
      </p>
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
