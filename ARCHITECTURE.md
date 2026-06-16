# Arsitektur — HomeDoc

Modular monolith: satu app Next.js (App Router) + SQLite, satu proses. Demo = keputusan **data & scope** (data dummy, integrasi eksternal di luar lingkup), **bukan** keputusan kualitas kode. Kode production-grade sejak hari pertama.

Praktik **keperawatan mandiri**, self-pay. Dua peran: **perawat** (pemilik/superuser) dan **asisten** (front desk).

## Prinsip

1. **Feature-modular.** Tiap domain (`pasien`, `antrian`, `rekam-medis`, `stok`, `kasir`, `laporan`, `penggajian`) berdiri sendiri: komponen, hook, query-nya masing-masing. Tambah modul = ikuti pola yang sama, tanpa menyentuh modul lain.
2. **Seam yang bisa ditukar.** Hal yang di-stub (auth) ada di balik interface bertipe di `src/lib/services`, ditandai `// DEMO STUB`. Produksi menukar implementasi, bukan call site.
3. **Config-driven.** Identitas klinik, SIPP, threshold stok/expiry, locale, page size — semua di `src/lib/config.ts` (`CONFIG`). Re-skin klinik lain = edit satu file.
4. **Data layer terisolasi.** Hanya `src/lib/db/*` yang menyentuh SQL. Sisanya panggil fungsi bertipe. Pindah SQLite → Postgres cukup sentuh layer ini.
5. **Strict typing.** `strict` + `noUncheckedIndexedAccess`. Tanpa `any`, tanpa `as` paksa, tanpa `@ts-ignore`. Enum = literal union (lihat `src/types`).

## Alur lapisan

```
app/ (page tipis)  →  hooks/ (logika, fetch, mutation)  →  app/api/*/route.ts
                                                                   ↓
                                                       lib/db/*  (repository, SQL)
                                                                   ↓
                                                          SQLite (db/clinic.db)
```

Komponen **tidak pernah** memanggil DB langsung. Page **tidak** menaruh logika bisnis — hanya merangkai komponen + memanggil hook. Route handler tipis: guard auth → parse/validasi → panggil repository → JSON.

## Peran & akses

Didefinisikan di `src/components/layout/nav.ts`:

- **perawat** — semua modul, termasuk Rekam Medis, Laporan, Penggajian, Manajemen Staf.
- **asisten** — Dashboard, Pasien, Antrian, Riwayat, Stok, Kasir, Laporan.

Penggajian hanya mencakup **asisten** — perawat adalah pemilik, dikecualikan dari daftar gaji (`lib/db/payroll.ts`).

## Struktur folder

```
db/                schema.sql, seed.ts (faker id_ID), reset.ts, clinic.db (WAL)
src/app/           route App Router: grup (app) & /login, /print, /api
src/components/ui  design system: Button Card Input DataTable Combobox CustomSelect
                     DatePicker TimePicker Modal ConfirmDialog DropdownMenu Toast
                     StatusPill PageHeader EmptyState Skeleton
src/components/<domain>  komponen per fitur (pasien, antrian, rekam-medis, stok,
                     kasir, laporan, penggajian, pengaturan, dashboard, layout, print)
src/hooks/         useAuth useClinic usePatients useQueue useConsult useInventory
                     useKasir useReports
src/lib/db/        repository per domain (satu-satunya tempat SQL):
                     patients queue consult records inventory billing reports
                     payroll dashboard users settings + client (koneksi + migrate)
src/lib/services/  seam: auth.ts (// DEMO STUB)
src/lib/           config.ts, format.ts (rupiah/WIB/NIK/formatThousands), fefo.ts
                     (murni), status.ts, csv.ts, xlsx.ts, fetcher.ts, session.ts, cn.ts
src/lib/validation/  patient.ts
src/types/         tipe domain terpusat (index.ts)
```

## Pola menambah modul baru (resep)

1. Tipe di `src/types/index.ts`.
2. Repository `src/lib/db/<modul>.ts` (query bertipe).
3. Route handler `src/app/api/<modul>/route.ts`.
4. Hook `src/hooks/use<Modul>.ts` (fetch + mutation + derived state) — atau fetch inline untuk view admin kecil.
5. Komponen `src/components/<modul>/`.
6. Page tipis `src/app/(app)/<modul>/page.tsx`.
7. Entri nav `src/components/layout/nav.ts` dengan `roles` yang benar.

## Skema DB & migrasi

- Skema kanonik: `db/schema.sql`, diterapkan pada DB baru via `npm run db:reset`.
- DB lama bermigrasi di `src/lib/db/client.ts` → `migrate()`: `ALTER TABLE ADD COLUMN` dan `CREATE TABLE IF NOT EXISTS` yang **idempoten**. Kolom/tabel baru ditambah ke **dua tempat**: `schema.sql` dan `migrate()`.
- Seed deterministik (`faker.seed`) di `db/seed.ts`. `db:reset` destruktif — jangan dijalankan tanpa konfirmasi.

## Seam stub (status demo)

| Service | File | Demo | Produksi |
|---|---|---|---|
| Auth | `lib/services/auth.ts` | cookie session (iron-session) + user seed; role-switch instan | SSO/OIDC identitas klinik |

Integrasi eksternal (SATUSEHAT, BPJS VClaim, payment gateway QRIS) **di luar lingkup demo** — tidak ada kode service-nya. Jaminan BPJS hanya dibedakan di UI/laporan (`Umum` vs `BPJS`), tanpa panggilan VClaim. Pembayaran dicatat sebagai metode (tunai/transfer/QRIS) tanpa gateway.

## Catatan kepatuhan

- **Rekam medis append-only.** `soap_notes` tidak pernah di-`UPDATE`/`DELETE`. Koreksi = baris baru dengan `amends_id` menunjuk baris lama; rantai tetap teraudit.
- **`record_access_log`** mencatat view/create/amend tiap rekam medis.
- **Asuhan keperawatan** (`visit_interventions`): masalah, etiologi, intervensi per kunjungan.
- **NIK** 16 digit sebagai identitas pasien; **SIPP** perawat tampil di profil + dokumen cetak (struk).
- **FEFO** (`src/lib/fefo.ts`): stok kadaluarsa-terdekat keluar lebih dulu — pure & testable; persist via transaksi di repository.

## Money & waktu

- Uang = **INTEGER rupiah** (tanpa float). Input live diformat ribuan via `formatThousands` (state simpan digit mentah).
- Waktu = TEXT ISO-8601 **WIB** (`Asia/Jakarta`, +07:00). Format tampil DD/MM/YYYY via `src/lib/format.ts`.

## Reset demo

`npm run db:reset` — hapus DB, buat ulang dari `schema.sql`, reseed deterministik. Aman dijalankan berulang antar sesi demo.
