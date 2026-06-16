"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEG_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  pasien: "Pasien",
  antrian: "Antrian & Booking",
  "rekam-medis": "Rekam Medis",
  riwayat: "Riwayat",
  stok: "Stok & Obat",
  kasir: "Kasir",
  laporan: "Laporan",
  pengaturan: "Pengaturan",
};

function labelFor(seg: string): string {
  if (SEG_LABEL[seg]) return SEG_LABEL[seg];
  if (/^\d+$/.test(seg)) return "Detail";
  return seg;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // No trail on the dashboard itself (it's the home).
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    return null;
  }

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    last: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
      <Link href="/dashboard" className="hover:text-slate-600">
        Beranda
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1.5">
          <span className="text-slate-300">/</span>
          {c.last ? (
            <span className="font-medium text-slate-600">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-slate-600">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
