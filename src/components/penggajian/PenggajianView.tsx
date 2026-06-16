"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { useToast } from "@/components/ui/Toast";
import { IconKasir } from "@/components/layout/icons";
import { getJson, postJson, deleteJson } from "@/lib/fetcher";
import { rupiah, tglWIB, monthWIB } from "@/lib/format";
import type { PayrollRow, Role } from "@/types";

const ROLE_LABEL: Record<Role, string> = { asisten: "Asisten", perawat: "Perawat" };

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  return Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: fmt.format(d) };
  });
}

export function PenggajianView() {
  const { toast } = useToast();
  const [month, setMonth] = useState(monthWIB());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayrollRow | null>(null);
  const [undoTarget, setUndoTarget] = useState<PayrollRow | null>(null);
  const months = useMemo(monthOptions, []);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<{ rows: PayrollRow[] }>(`/api/payroll?month=${month}`);
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat penggajian.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalLunas = rows.filter((r) => r.status === "lunas").reduce((s, r) => s + (r.jumlah ?? 0), 0);
  const belumCount = rows.filter((r) => r.status === "belum").length;

  const columns = useMemo<Column<PayrollRow>[]>(
    () => [
      { id: "nama", header: "Nama", value: (r) => r.nama, sortable: true },
      {
        id: "role",
        header: "Peran",
        filter: "select",
        value: (r) => ROLE_LABEL[r.role],
      },
      {
        id: "gaji",
        header: "Gaji",
        align: "right",
        sortable: true,
        value: (r) => r.gaji ?? 0,
        render: (r) => (r.gaji != null ? rupiah(r.gaji) : "—"),
      },
      {
        id: "status",
        header: "Status",
        filter: "select",
        value: (r) => (r.status === "lunas" ? "Lunas" : "Belum"),
        render: (r) =>
          r.status === "lunas" ? (
            <StatusPill tone="success">Lunas{r.paidAt ? ` · ${tglWIB(r.paidAt)}` : ""}</StatusPill>
          ) : (
            <StatusPill tone="warning">Belum</StatusPill>
          ),
      },
      {
        id: "aksi",
        header: "",
        align: "right",
        render: (r) =>
          r.status === "lunas" ? (
            <Button size="sm" variant="secondary" onClick={() => setUndoTarget(r)}>
              Batalkan
            </Button>
          ) : (
            <Button size="sm" disabled={r.gaji == null || r.gaji <= 0} onClick={() => setPayTarget(r)}>
              Tandai Lunas
            </Button>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Penggajian"
        description="Tandai gaji staf terkirim per bulan"
        action={
          <CustomSelect value={month} onChange={setMonth} options={months} className="w-44" />
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Gaji Terkirim" value={rupiah(totalLunas)} icon={<IconKasir className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Belum Dibayar" value={String(belumCount)} icon={<IconKasir className="h-5 w-5" />} tone="amber" />
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        getRowId={(r) => r.userId}
        searchPlaceholder="Cari staf…"
        emptyTitle="Belum ada staf aktif"
      />

      <ConfirmDialog
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onConfirm={async () => {
          if (!payTarget) return;
          try {
            await postJson("/api/payroll", { userId: payTarget.userId, bulan: month });
            toast("Gaji ditandai lunas");
            await refresh();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Gagal", "error");
          }
        }}
        title="Tandai Gaji Lunas"
        message={`Tandai gaji ${payTarget?.nama ?? ""} sebesar ${rupiah(payTarget?.gaji ?? 0)} sebagai terkirim? Pengeluaran "Gaji" otomatis dicatat di Laporan.`}
        confirmLabel="Tandai Lunas"
      />

      <ConfirmDialog
        open={undoTarget !== null}
        onClose={() => setUndoTarget(null)}
        onConfirm={async () => {
          if (!undoTarget) return;
          try {
            await deleteJson(`/api/payroll?userId=${undoTarget.userId}&month=${month}`);
            toast("Status gaji dibatalkan");
            await refresh();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Gagal", "error");
          }
        }}
        title="Batalkan Status Gaji"
        message={`Batalkan status lunas untuk ${undoTarget?.nama ?? ""}? Pengeluaran "Gaji" terkait ikut dihapus.`}
        confirmLabel="Batalkan"
      />
    </>
  );
}
