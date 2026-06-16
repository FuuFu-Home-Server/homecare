/**
 * Single source of truth for clinic identity, locale, and business thresholds.
 * Re-skinning the app for another clinic = editing this file only.
 * No magic values anywhere else in the codebase.
 */

export interface ClinicConfig {
  nama: string;
  penanggungJawab: string;
  sipp: string;
  alamat: string;
  telepon: string;
  kota: string;
  /** Brand shown in sidebar/topbar and as the struk header title. */
  appTitle: string;
  /** Receipt footer note (replaces the hardcoded thank-you line). */
  strukFooter: string;
  /** Optional second small footer line on the struk. */
  strukFooter2: string;
}

export interface AppConfig {
  clinic: ClinicConfig;
  locale: string;
  timezone: string;
  currency: string;
  /** Consultation base fee in rupiah. */
  biayaKonsultasi: number;
  /** A batch within this many days of expiry triggers a near-expiry warning. */
  nearExpiryDays: number;
  /** Medicine total stock at or below this triggers a low-stock alert. */
  lowStockThreshold: number;
  /** Default DataTable page size and selectable options. */
  defaultPageSize: number;
  pageSizeOptions: ReadonlyArray<number>;
}

export const CONFIG: AppConfig = {
  clinic: {
    nama: "Praktik Keperawatan Mandiri Sehat Bersama",
    penanggungJawab: "Ns. Dewi Lestari, S.Kep.",
    sipp: "503/SIPP/2354/DPMPTSP/2024",
    alamat: "Jl. Melati Raya No. 14, Kel. Sukamaju",
    telepon: "0812-3456-7890",
    kota: "Bandung",
    appTitle: "HomeDoc",
    strukFooter: "Terima kasih atas kunjungan Anda. Semoga lekas sehat.",
    strukFooter2: "",
  },
  locale: "id-ID",
  timezone: "Asia/Jakarta",
  currency: "IDR",
  biayaKonsultasi: 50_000,
  nearExpiryDays: 90,
  lowStockThreshold: 20,
  defaultPageSize: 10,
  pageSizeOptions: [10, 25, 50],
};
