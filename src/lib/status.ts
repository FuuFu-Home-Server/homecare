import type { AntrianStatus, BillStatus, MetodeBayar, Jaminan } from "@/types";
import type { PillTone } from "@/components/ui/StatusPill";

interface Meta {
  label: string;
  tone: PillTone;
}

export const ANTRIAN_META: Record<AntrianStatus, Meta> = {
  terdaftar: { label: "Terdaftar", tone: "neutral" },
  tiba: { label: "Sudah Tiba", tone: "info" },
  diperiksa: { label: "Diperiksa", tone: "brand" },
  selesai: { label: "Selesai", tone: "success" },
  batal: { label: "Batal", tone: "danger" },
};

export const BILL_META: Record<BillStatus, Meta> = {
  draft: { label: "Draft", tone: "neutral" },
  tertunda: { label: "Belum Bayar", tone: "warning" },
  lunas: { label: "Lunas", tone: "success" },
  batal: { label: "Batal", tone: "danger" },
};

export const JAMINAN_META: Record<Jaminan, Meta> = {
  umum: { label: "Umum", tone: "neutral" },
  bpjs: { label: "BPJS", tone: "info" },
};

export const METODE_LABEL: Record<MetodeBayar, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
};
