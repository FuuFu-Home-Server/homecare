"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { MedicineFormModal } from "@/components/stok/MedicineFormModal";
import { IconPlus, IconStok, IconAlert } from "@/components/layout/icons";
import { useInventory } from "@/hooks/useInventory";
import { CONFIG } from "@/lib/config";
import { rupiah, tglWIB, daysUntil } from "@/lib/format";
import type { MedicineStock } from "@/types";

const BENTUK_LABEL: Record<MedicineStock["bentuk"], string> = {
  tablet: "Tablet",
  sirup: "Sirup",
  injeksi: "Injeksi",
  kapsul: "Kapsul",
  salep: "Salep",
  tetes: "Tetes",
};

export function StokView() {
  const router = useRouter();
  const { medicines, loading, error, createMedicine } = useInventory();
  const [addOpen, setAddOpen] = useState(false);

  const lowCount = medicines.filter((m) => m.totalQty <= CONFIG.lowStockThreshold).length;
  const nearCount = medicines.filter(
    (m) => m.nearestExpiry !== null && daysUntil(m.nearestExpiry) <= CONFIG.nearExpiryDays,
  ).length;

  const columns = useMemo<Column<MedicineStock>[]>(
    () => [
      {
        id: "nama",
        header: "Nama Obat",
        value: (m) => m.nama,
        sortable: true,
        render: (m) => (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{m.nama}</span>
              {m.obatKeras ? <StatusPill tone="danger">Keras</StatusPill> : null}
              {m.isConsumable ? <StatusPill tone="neutral">BMHP</StatusPill> : null}
            </div>
            {m.merek ? <div className="text-xs text-slate-400">{m.merek}</div> : null}
          </div>
        ),
      },
      {
        id: "bentuk",
        header: "Bentuk",
        filter: "select",
        value: (m) => BENTUK_LABEL[m.bentuk],
      },
      {
        id: "stok",
        header: "Stok",
        align: "right",
        value: (m) => m.totalQty,
        sortable: true,
        render: (m) => (
          <span className="inline-flex items-center gap-2">
            <span className="tabular text-slate-700">
              {m.totalQty} {m.satuan}
            </span>
            {m.totalQty <= CONFIG.lowStockThreshold ? <StatusPill tone="warning">menipis</StatusPill> : null}
          </span>
        ),
      },
      {
        id: "expiry",
        header: "Kadaluarsa Terdekat",
        value: (m) => m.nearestExpiry ?? "",
        sortable: true,
        render: (m) => {
          if (!m.nearestExpiry) return <span className="text-slate-400">—</span>;
          const sisa = daysUntil(m.nearestExpiry);
          return (
            <span className="inline-flex items-center gap-2">
              <span className="text-slate-600">{tglWIB(m.nearestExpiry)}</span>
              {sisa <= CONFIG.nearExpiryDays ? (
                <StatusPill tone={sisa <= 30 ? "danger" : "warning"}>{sisa} hari</StatusPill>
              ) : null}
            </span>
          );
        },
      },
      { id: "harga", header: "Harga", align: "right", value: (m) => m.hargaJual, render: (m) => rupiah(m.hargaJual), sortable: true },
      {
        id: "kategori",
        header: "Kategori",
        filter: "select",
        value: (m) => (m.isConsumable ? "BMHP" : "Obat"),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Stok & Obat"
        description={`${medicines.length} item inventaris`}
        action={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Tambah Obat
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <IconStok className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-slate-500">Stok Menipis</p>
            <p className="text-lg font-semibold tabular text-slate-900">{lowCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <IconAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs text-slate-500">Hampir Kadaluarsa</p>
            <p className="text-lg font-semibold tabular text-slate-900">{nearCount}</p>
          </div>
        </Card>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={medicines}
        loading={loading}
        getRowId={(m) => m.id}
        onRowClick={(m) => router.push(`/stok/${m.id}`)}
        searchPlaceholder="Cari obat…"
        emptyTitle="Belum ada obat"
        emptyAction={<Button onClick={() => setAddOpen(true)}>Tambah Obat</Button>}
      />

      <MedicineFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (input) => {
          await createMedicine(input);
        }}
      />
    </>
  );
}
