-- Klinik Pratama — SQLite schema
-- Money stored as INTEGER rupiah. Timestamps TEXT ISO-8601 (WIB).
-- Enums enforced via CHECK constraints to mirror the TypeScript literal unions.

PRAGMA foreign_keys = ON;

-- ===== AUTH =====
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('asisten','perawat')),
  nama          TEXT NOT NULL,
  telepon       TEXT,
  info          TEXT,
  alamat        TEXT,
  tanggal_mulai TEXT,
  pembayaran    TEXT,
  gaji          INTEGER,
  aktif         INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0,1)),
  created_at    TEXT NOT NULL
);

-- Single-row clinic identity, editable from Settings. Seeded from config defaults.
CREATE TABLE clinic_settings (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  nama             TEXT NOT NULL,
  penanggung_jawab TEXT NOT NULL,
  sipp             TEXT NOT NULL,
  alamat           TEXT NOT NULL,
  kota             TEXT NOT NULL,
  telepon          TEXT NOT NULL,
  app_title        TEXT NOT NULL DEFAULT '',
  struk_footer     TEXT NOT NULL DEFAULT '',
  struk_footer2    TEXT NOT NULL DEFAULT ''
);

-- Weekly practice schedule as open sessions (each weekday can have several,
-- e.g. pagi + sore). A day with no sessions is closed.
CREATE TABLE clinic_schedule_session (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  day       INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  jam_buka  TEXT NOT NULL,
  jam_tutup TEXT NOT NULL
);
CREATE INDEX idx_schedule_day ON clinic_schedule_session (day);

-- ===== PASIEN =====
CREATE TABLE patients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  no_rm         TEXT NOT NULL UNIQUE,
  nik           TEXT NOT NULL UNIQUE,
  nama          TEXT NOT NULL,
  tgl_lahir     TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  alamat        TEXT,
  telepon       TEXT,
  jaminan       TEXT NOT NULL DEFAULT 'umum' CHECK (jaminan IN ('umum','bpjs')),
  bpjs_no       TEXT,
  alergi        TEXT,
  agama         TEXT CHECK (agama IN ('Islam','Kristen','Katolik','Hindu','Buddha','Konghucu')),
  pekerjaan     TEXT,
  pendidikan    TEXT CHECK (pendidikan IN ('Tidak Sekolah','SD','SMP','SMA','D3','S1','S2','S3')),
  status_nikah  TEXT CHECK (status_nikah IN ('Belum Menikah','Menikah','Cerai Hidup','Cerai Mati')),
  riwayat_keluarga TEXT,
  merokok       TEXT CHECK (merokok IN ('Tidak Merokok','Perokok Aktif','Mantan Perokok')),
  alkohol       TEXT CHECK (alkohol IN ('Tidak','Kadang-kadang','Sering')),
  pola_makan    TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_patients_nik   ON patients (nik);
CREATE INDEX idx_patients_nama  ON patients (nama);
CREATE INDEX idx_patients_no_rm ON patients (no_rm);

-- ===== ANTRIAN / KUNJUNGAN =====
-- One visit = one queue entry = the anchor every clinical/financial row hangs off.
CREATE TABLE visits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES patients (id),
  tanggal       TEXT NOT NULL,
  nomor_antrian INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'terdaftar'
                  CHECK (status IN ('terdaftar','tiba','diperiksa','selesai','batal')),
  keluhan_utama TEXT,
  td_sistol     INTEGER,
  td_diastol    INTEGER,
  suhu          REAL,
  berat         REAL,
  tinggi        REAL,
  created_by    INTEGER NOT NULL REFERENCES users (id),
  created_at    TEXT NOT NULL,
  UNIQUE (tanggal, nomor_antrian)
);
CREATE INDEX idx_visits_patient ON visits (patient_id);
CREATE INDEX idx_visits_tanggal ON visits (tanggal);

-- ===== REKAM MEDIS (append-only, Permenkes 24/2022) =====
-- Records are never UPDATEd or DELETEd. A correction is a NEW row whose
-- amends_id points at the row it supersedes. The full chain stays auditable.
CREATE TABLE soap_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id    INTEGER NOT NULL REFERENCES visits (id),
  subjective  TEXT,
  objective   TEXT,
  assessment  TEXT,
  plan        TEXT,
  doctor_id   INTEGER NOT NULL REFERENCES users (id),
  created_at  TEXT NOT NULL,
  amends_id   INTEGER REFERENCES soap_notes (id)
);
CREATE INDEX idx_soap_visit ON soap_notes (visit_id);

-- Nursing care (asuhan keperawatan): problems, etiology, interventions per visit.
CREATE TABLE visit_interventions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id   INTEGER NOT NULL REFERENCES visits (id),
  kategori   TEXT NOT NULL CHECK (kategori IN ('masalah','etiologi','intervensi')),
  label      TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_intv_visit ON visit_interventions (visit_id);

-- Compliance: who viewed/created/amended a record and when.
CREATE TABLE record_access_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id   INTEGER NOT NULL REFERENCES visits (id),
  user_id    INTEGER NOT NULL REFERENCES users (id),
  action     TEXT NOT NULL CHECK (action IN ('view','create','amend')),
  detail     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_access_visit ON record_access_log (visit_id);

-- ===== STOK =====
CREATE TABLE medicines (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT NOT NULL,
  merek         TEXT,
  bentuk        TEXT NOT NULL
                  CHECK (bentuk IN ('tablet','sirup','injeksi','kapsul','salep','tetes')),
  satuan        TEXT NOT NULL,
  harga_jual    INTEGER NOT NULL,
  obat_keras    INTEGER NOT NULL DEFAULT 0 CHECK (obat_keras IN (0,1)),
  is_consumable INTEGER NOT NULL DEFAULT 0 CHECK (is_consumable IN (0,1)),
  supplier      TEXT
);
CREATE INDEX idx_medicines_nama ON medicines (nama);

-- FEFO unit: each physical batch with its own expiry and remaining qty.
CREATE TABLE medicine_batches (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  medicine_id    INTEGER NOT NULL REFERENCES medicines (id),
  no_batch       TEXT NOT NULL,
  tgl_kadaluarsa TEXT NOT NULL,
  qty            INTEGER NOT NULL,
  harga_beli     INTEGER,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_batch_medicine ON medicine_batches (medicine_id);
CREATE INDEX idx_batch_expiry   ON medicine_batches (tgl_kadaluarsa);

-- Append-only audit trail of every stock change (in, out via dispensing, adjustment).
CREATE TABLE stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id   INTEGER NOT NULL REFERENCES medicine_batches (id),
  visit_id   INTEGER REFERENCES visits (id),
  tipe       TEXT NOT NULL CHECK (tipe IN ('masuk','keluar','penyesuaian')),
  qty        INTEGER NOT NULL,
  alasan     TEXT,
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_movement_batch ON stock_movements (batch_id);
CREATE INDEX idx_movement_visit ON stock_movements (visit_id);

-- ===== TINDAKAN =====
CREATE TABLE treatments (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  nama  TEXT NOT NULL,
  harga INTEGER NOT NULL,
  aktif INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0,1))
);

-- ===== RESEP =====
CREATE TABLE prescriptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id     INTEGER NOT NULL REFERENCES visits (id),
  medicine_id  INTEGER NOT NULL REFERENCES medicines (id),
  qty          INTEGER NOT NULL,
  aturan_pakai TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_presc_visit ON prescriptions (visit_id);

-- ===== KASIR / KEUANGAN =====
CREATE TABLE bills (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id   INTEGER NOT NULL UNIQUE REFERENCES visits (id),
  jaminan    TEXT NOT NULL CHECK (jaminan IN ('umum','bpjs')),
  subtotal   INTEGER NOT NULL DEFAULT 0,
  diskon     INTEGER NOT NULL DEFAULT 0,
  total      INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','tertunda','lunas','batal')),
  metode     TEXT CHECK (metode IN ('tunai','transfer','qris')),
  dibayar    INTEGER,
  kembalian  INTEGER,
  paid_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_bills_status ON bills (status);

CREATE TABLE bill_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id      INTEGER NOT NULL REFERENCES bills (id),
  tipe         TEXT NOT NULL CHECK (tipe IN ('konsultasi','obat','tindakan')),
  ref_id       INTEGER,
  deskripsi    TEXT NOT NULL,
  qty          INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL,
  subtotal     INTEGER NOT NULL
);
CREATE INDEX idx_bill_items_bill ON bill_items (bill_id);

CREATE TABLE expenses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal    TEXT NOT NULL,
  kategori   TEXT NOT NULL,
  deskripsi  TEXT NOT NULL,
  jumlah     INTEGER NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_expenses_tanggal ON expenses (tanggal);

CREATE TABLE salary_payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  bulan      TEXT NOT NULL,
  jumlah     INTEGER NOT NULL,
  expense_id INTEGER REFERENCES expenses (id),
  paid_at    TEXT NOT NULL,
  paid_by    INTEGER NOT NULL REFERENCES users (id),
  UNIQUE (user_id, bulan)
);

CREATE TABLE cash_closings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal           TEXT NOT NULL UNIQUE,
  total_tunai       INTEGER NOT NULL DEFAULT 0,
  total_transfer    INTEGER NOT NULL DEFAULT 0,
  total_qris        INTEGER NOT NULL DEFAULT 0,
  total_pengeluaran INTEGER NOT NULL DEFAULT 0,
  saldo             INTEGER NOT NULL DEFAULT 0,
  closed_by         INTEGER NOT NULL REFERENCES users (id),
  closed_at         TEXT NOT NULL
);
