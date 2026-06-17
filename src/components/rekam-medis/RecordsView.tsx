"use client";

import { IconAlert, IconDownload } from "@/components/layout/icons";
import { Button } from "@/components/ui/Button";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePicker } from "@/components/ui/DatePicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { useQueue } from "@/hooks/useQueue";
import { getJson } from "@/lib/fetcher";
import { tglWIB, todayWIB, umur } from "@/lib/format";
import { ANTRIAN_META, JAMINAN_META } from "@/lib/status";
import { downloadXlsx } from "@/lib/xlsx";
import { fileSlug } from "@/lib/filename";
import type { JenisKelamin, MedicalRecordExportRow, QueueEntry } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const KELAMIN_LABEL: Record<JenisKelamin, string> = { L: "Laki-laki", P: "Perempuan" };

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: fmt.format(d) };
  });
  return [{ value: "", label: "Rentang custom" }, ...months];
}

function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-");
  const last = new Date(Number(y), Number(m), 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function RecordsView() {
  const router = useRouter();
  const { toast } = useToast();
  const { queue, loading, error } = useQueue(todayWIB(), "riwayat");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState("");
  const [exporting, setExporting] = useState(false);
  const months = useMemo(monthOptions, []);

  const rows = useMemo(
    () => queue.filter((q) => (!from || q.tanggal >= from) && (!to || q.tanggal <= to)),
    [queue, from, to],
  );

  const pickMonth = (m: string): void => {
    setMonth(m);
    if (m) {
      const b = monthBounds(m);
      setFrom(b.from);
      setTo(b.to);
    }
  };

  // Manual date edits fall back to "custom range".
  const setFromCustom = (v: string): void => {
    setMonth("");
    setFrom(v);
  };
  const setToCustom = (v: string): void => {
    setMonth("");
    setTo(v);
  };

  async function exportXlsx(): Promise<void> {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { rows: data } = await getJson<{ rows: MedicalRecordExportRow[] }>(
        `/api/records/export?${params.toString()}`,
      );
      if (data.length === 0) {
        toast("Tidak ada data untuk diekspor", "error");
        return;
      }
      await downloadXlsx(
        fileSlug("riwayat-rekam-medis", from, to),
        "Riwayat Rekam Medis",
        [
          { header: "Tanggal", key: "tanggal", width: 12 },
          { header: "No. RM", key: "noRm", width: 12 },
          { header: "NIK", key: "nik", width: 20 },
          { header: "Pasien", key: "pasien", width: 24 },
          { header: "Tgl Lahir", key: "tglLahir", width: 12 },
          { header: "Umur", key: "umur", width: 7 },
          { header: "Kelamin", key: "kelamin", width: 11 },
          { header: "Jaminan", key: "jaminan", width: 9 },
          { header: "No. BPJS", key: "bpjsNo", width: 18 },
          { header: "Alamat", key: "alamat", width: 28, wrap: true },
          { header: "Telepon", key: "telepon", width: 14 },
          { header: "Agama", key: "agama", width: 12 },
          { header: "Pekerjaan", key: "pekerjaan", width: 16 },
          { header: "Pendidikan", key: "pendidikan", width: 12 },
          { header: "Status Nikah", key: "statusNikah", width: 14 },
          { header: "Alergi", key: "alergi", width: 16, wrap: true },
          { header: "Riwayat Keluarga", key: "riwayatKeluarga", width: 24, wrap: true },
          { header: "Merokok", key: "merokok", width: 14, group: "Gaya Hidup" },
          { header: "Alkohol", key: "alkohol", width: 14, group: "Gaya Hidup" },
          { header: "Pola Makan", key: "polaMakan", width: 20, wrap: true, group: "Gaya Hidup" },
          { header: "Keluhan", key: "keluhan", width: 24, wrap: true },
          { header: "Status", key: "status", width: 11 },
          { header: "TD (mmHg)", key: "td", width: 12, group: "Vital" },
          { header: "Suhu (°C)", key: "suhu", width: 10, group: "Vital" },
          { header: "BB (kg)", key: "berat", width: 9, group: "Vital" },
          { header: "TB (cm)", key: "tinggi", width: 9, group: "Vital" },
          { header: "S (Subjective)", key: "subjective", width: 30, wrap: true, group: "SOAP" },
          { header: "O (Objective)", key: "objective", width: 30, wrap: true, group: "SOAP" },
          { header: "A (Assessment)", key: "assessment", width: 30, wrap: true, group: "SOAP" },
          { header: "P (Plan)", key: "plan", width: 30, wrap: true, group: "SOAP" },
          { header: "Masalah", key: "masalah", width: 24, wrap: true },
          { header: "Etiologi", key: "etiologi", width: 24, wrap: true },
          { header: "Intervensi", key: "intervensi", width: 28, wrap: true },
          { header: "Resep", key: "resep", width: 30, wrap: true },
          { header: "Tindakan", key: "tindakan", width: 28, wrap: true },
        ],
        data.map((r) => ({
          tanggal: tglWIB(r.tanggal),
          noRm: r.noRm,
          nik: r.nik,
          pasien: r.pasien,
          tglLahir: tglWIB(r.tglLahir),
          umur: r.umur,
          kelamin: KELAMIN_LABEL[r.jenisKelamin],
          jaminan: JAMINAN_META[r.jaminan].label,
          bpjsNo: r.bpjsNo,
          alamat: r.alamat,
          telepon: r.telepon,
          agama: r.agama,
          pekerjaan: r.pekerjaan,
          pendidikan: r.pendidikan,
          statusNikah: r.statusNikah,
          alergi: r.alergi,
          riwayatKeluarga: r.riwayatKeluarga,
          merokok: r.merokok,
          alkohol: r.alkohol,
          polaMakan: r.polaMakan,
          keluhan: r.keluhan,
          status: ANTRIAN_META[r.status].label,
          td: r.td,
          suhu: r.suhu,
          berat: r.berat,
          tinggi: r.tinggi,
          subjective: r.subjective,
          objective: r.objective,
          assessment: r.assessment,
          plan: r.plan,
          masalah: r.masalah,
          etiologi: r.etiologi,
          intervensi: r.intervensi,
          resep: r.resep,
          tindakan: r.tindakan,
        })),
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengekspor", "error");
    } finally {
      setExporting(false);
    }
  }

  const columns = useMemo<Column<QueueEntry>[]>(
    () => [
      {
        id: "tanggal",
        header: "Tanggal",
        value: (q) => q.tanggal,
        render: (q) => <span className="text-sm text-slate-600">{tglWIB(q.tanggal)}</span>,
        sortable: true,
      },
      {
        id: "nama",
        header: "Pasien",
        value: (q) => q.nama,
        render: (q) => (
          <div>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              {q.nama}
              {q.alergi ? <IconAlert className="h-4 w-4 text-red-500" /> : null}
            </div>
            <div className="text-xs text-slate-400">
              {umur(q.tglLahir)} th · No. RM {q.noRm}
            </div>
          </div>
        ),
        sortable: true,
      },
      {
        id: "jaminan",
        header: "Jaminan",
        filter: "select",
        value: (q) => JAMINAN_META[q.jaminan].label,
        render: (q) => (
          <StatusPill tone={JAMINAN_META[q.jaminan].tone}>
            {JAMINAN_META[q.jaminan].label}
          </StatusPill>
        ),
      },
      { id: "keluhan", header: "Keluhan", value: (q) => q.keluhanUtama ?? "—" },
      {
        id: "status",
        header: "Status",
        filter: "select",
        value: (q) => ANTRIAN_META[q.status].label,
        render: (q) => (
          <StatusPill tone={ANTRIAN_META[q.status].tone}>{ANTRIAN_META[q.status].label}</StatusPill>
        ),
      },
      {
        id: "aksi",
        header: "",
        align: "right",
        render: (q) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/riwayat/${q.visitId}`)}
            >
              Detail
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <>
      <PageHeader
        title="Riwayat Rekam Medis"
        description="Seluruh kunjungan lintas tanggal & pasien"
        action={
          <Button
            variant="secondary"
            leftIcon={<IconDownload className="h-4 w-4" />}
            onClick={exportXlsx}
            loading={exporting}
          >
            Ekspor Excel
          </Button>
        }
      />
      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        getRowId={(q) => q.visitId}
        searchPlaceholder="Cari pasien…"
        emptyTitle="Belum ada rekam medis"
        emptyDescription="Kunjungan yang sudah tercatat akan muncul di sini."
        toolbar={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="w-44">
              <CustomSelect value={month} onChange={pickMonth} options={months} />
            </div>
            <div className="w-40">
              <DatePicker
                value={from}
                max={to || undefined}
                onChange={setFromCustom}
                placeholder="Dari tanggal"
              />
            </div>
            <span className="text-sm text-slate-400">–</span>
            <div className="w-40">
              <DatePicker
                value={to}
                min={from || undefined}
                onChange={setToCustom}
                placeholder="Sampai tanggal"
              />
            </div>
            {from || to ? (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                  setMonth("");
                }}
                className="text-xs font-medium text-slate-500 hover:text-brand-700"
              >
                Reset
              </button>
            ) : null}
          </div>
        }
      />
    </>
  );
}
