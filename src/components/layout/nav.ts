import type { ComponentType, SVGProps } from "react";
import type { Role } from "@/types";
import {
  IconDashboard,
  IconPasien,
  IconAntrian,
  IconRiwayat,
  IconStok,
  IconKasir,
  IconLaporan,
} from "@/components/layout/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: ReadonlyArray<Role>;
}

const ALL: ReadonlyArray<Role> = ["asisten", "perawat"];
const PERAWAT: ReadonlyArray<Role> = ["perawat"];

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard, roles: ALL },
  { href: "/pasien", label: "Pasien", icon: IconPasien, roles: ALL },
  { href: "/antrian", label: "Kunjungan", icon: IconAntrian, roles: ALL },
  { href: "/riwayat", label: "Riwayat", icon: IconRiwayat, roles: ALL },
  { href: "/stok", label: "Stok & Obat", icon: IconStok, roles: ALL },
  { href: "/kasir", label: "Kasir", icon: IconKasir, roles: ALL },
  { href: "/laporan", label: "Laporan", icon: IconLaporan, roles: ALL },
  { href: "/penggajian", label: "Penggajian", icon: IconKasir, roles: PERAWAT },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
