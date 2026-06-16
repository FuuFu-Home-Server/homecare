import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillById, getBillItems } from "@/lib/db/billing";
import { getVisit } from "@/lib/db/queue";
import { getPatient } from "@/lib/db/patients";
import { PrintButton } from "@/components/print/PrintButton";
import { getClinic } from "@/lib/db/settings";
import { rupiah, tglJamWIB } from "@/lib/format";
import { METODE_LABEL, JAMINAN_META } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function StrukPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const bill = getBillById(Number(billId));
  if (!bill) notFound();
  const items = getBillItems(bill.id);
  const visit = getVisit(bill.visitId);
  const patient = visit ? getPatient(visit.patientId) : null;
  if (!visit || !patient) notFound();

  const clinic = getClinic();

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
