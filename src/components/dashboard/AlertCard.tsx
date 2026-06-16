import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconCheck } from "@/components/layout/icons";
import { tglWIB } from "@/lib/format";
import type { LowStockItem, NearExpiryItem } from "@/types";

export interface LowStockCardProps {
  items: LowStockItem[];
}

export function LowStockCard({ items }: LowStockCardProps) {
  return (
    <Card>
      <CardHeader
        title="Stok Menipis"
        subtitle="Obat di bawah batas aman"
        action={<StatusPill tone={items.length ? "warning" : "success"}>{items.length}</StatusPill>}
      />
      {items.length === 0 ? (
        <EmptyState icon={<IconCheck className="h-8 w-8" />} title="Semua stok aman" />
      ) : (
        <ul className="divide-y divide-slate-100 px-5 pb-2">
          {items.slice(0, 6).map((it) => (
            <li key={it.medicineId} className="flex items-center justify-between py-2.5 text-sm">
              <span className="truncate text-slate-700">{it.nama}</span>
              <span className="shrink-0 tabular text-amber-700">
                {it.totalQty} {it.satuan}
              </span>
            </li>
          ))}
        </ul>
      )}
      <FooterLink href="/stok" count={items.length} label="Lihat semua stok" />
    </Card>
  );
}

export interface NearExpiryCardProps {
  items: NearExpiryItem[];
}

export function NearExpiryCard({ items }: NearExpiryCardProps) {
  return (
    <Card>
      <CardHeader
        title="Hampir Kadaluarsa"
        subtitle="Batch mendekati tanggal kedaluwarsa"
        action={<StatusPill tone={items.length ? "warning" : "success"}>{items.length}</StatusPill>}
      />
      {items.length === 0 ? (
        <EmptyState icon={<IconCheck className="h-8 w-8" />} title="Tidak ada yang hampir kadaluarsa" />
      ) : (
        <ul className="divide-y divide-slate-100 px-5 pb-2">
          {items.slice(0, 6).map((it) => (
            <li key={it.batchId} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-slate-700">{it.nama}</span>
                <span className="block text-xs text-slate-400">
                  Batch {it.noBatch} · {tglWIB(it.tglKadaluarsa)}
                </span>
              </span>
              <StatusPill tone={it.sisaHari <= 30 ? "danger" : "warning"}>
                {it.sisaHari <= 0 ? "kadaluarsa" : `${it.sisaHari} hari`}
              </StatusPill>
            </li>
          ))}
        </ul>
      )}
      <FooterLink href="/stok" count={items.length} label="Kelola stok" />
    </Card>
  );
}

function FooterLink({ href, count, label }: { href: string; count: number; label: string }) {
  if (count === 0) return null;
  return (
    <div className="border-t border-slate-100 px-5 py-3">
      <Link href={href} className="text-xs font-medium text-brand-600 hover:text-brand-700">
        {label} →
      </Link>
    </div>
  );
}
