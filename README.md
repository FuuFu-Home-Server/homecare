# HomeDoc — Sistem Manajemen Praktik Keperawatan Mandiri

Aplikasi web untuk praktik keperawatan mandiri (home clinic) di Indonesia, self-pay. Dua peran:

- **Perawat** (pemilik/superuser) — rekam medis, asuhan keperawatan, laporan, penggajian, manajemen staf, plus semua akses asisten.
- **Asisten** (front desk) — registrasi pasien, antrian, vitals, stok & obat, kasir, dispensing, laporan.

Demo polish, fondasi production-grade. Lihat [ARCHITECTURE.md](./ARCHITECTURE.md) dan [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · better-sqlite3 · iron-session · Recharts · ExcelJS · Faker (id_ID).

## Mulai

```bash
npm install
npm run db:reset     # buat skema + seed data dummy
npm run dev          # http://localhost:3000
```

Login demo:

| Peran | Username | Password |
|---|---|---|
| Asisten | `asisten` | `asisten` |
| Perawat | `perawat` | `perawat` |

## Fitur

| Modul | Ringkas |
|---|---|
| Dashboard | Ringkasan kunjungan, pendapatan, tren |
| Pasien | Registrasi (NIK 16 digit), riwayat, rekam medis |
| Antrian | Alur registrasi → vitals → konsultasi → kasir |
| Rekam Medis | Asuhan keperawatan, SOAP append-only (perawat) |
| Stok & Obat | Batch, FEFO, low-stock & near-expiry alert |
| Kasir | Tagihan, diskon, metode bayar (tunai/transfer/QRIS), struk |
| Laporan | Keuangan, transaksi, pengeluaran, klinis, inventaris (+ CSV) |
| Penggajian | Tandai gaji asisten terkirim per bulan; auto-catat pengeluaran "Gaji" (perawat) |
| Pengaturan | Profil praktik, jadwal, akun, manajemen staf (perawat) |

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan dev server |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run db:reset` | Reset + reseed DB (aman diulang) |
| `npm run db:seed` | Reseed DB saja |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (src + db) |

## Konvensi

- **Uang**: integer rupiah (tanpa float). Input live diformat ribuan (`formatThousands`), state simpan digit mentah.
- **Waktu**: WIB (`Asia/Jakarta`). Tanggal tampil DD/MM/YYYY via `src/lib/format.ts`.
- **SQL** hanya di `src/lib/db/*`. Logika di `src/hooks/*`. Page tipis. Route handler tipis (guard → parse → repo → JSON).
- **Skema**: kolom/tabel baru ditambah ke `db/schema.sql` **dan** `migrate()` di `src/lib/db/client.ts` (additive, idempotent).
- Tanpa `any`/`as` paksa/`@ts-ignore`. Enum = literal union (`src/types`).

## Konfigurasi

- Identitas klinik, locale, threshold stok/expiry, page size → `src/lib/config.ts` (`CONFIG`). Re-skin klinik lain = edit satu file.
- Session secret produksi: env `SESSION_SECRET` (min. 32 karakter). Default demo sudah disetel.

## Catatan

- `db/clinic.db` (SQLite, WAL) lahir dari `db:reset`. `db:reset` destruktif.
- Auth, role-switch, dan integrasi eksternal di-stub (`// DEMO STUB`, `src/lib/services/`). Produksi tukar implementasi, bukan call site.
