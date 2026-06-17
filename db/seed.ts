/**
 * Seed believable Indonesian demo data with @faker-js/faker (id_ID).
 * Deterministic (fixed seed) so repeat demos are identical.
 *
 * Run via `npm run db:seed` (assumes schema already applied) or as part of
 * `npm run db:reset` which drops + recreates the file first.
 */
import Database from "better-sqlite3-multiple-ciphers";
import { fakerID_ID as faker } from "@faker-js/faker";
import { hashSync } from "@node-rs/argon2";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  console.error("db:seed is a dev-only tool and is disabled in production builds.");
  process.exit(1);
}

faker.seed(20260615);

const DB_PATH = path.join(process.cwd(), "db", "clinic.db");
const TZ_OFFSET = "+07:00";

// ----- WIB time helpers (seed runs in any host TZ, output must be WIB) -----
function iso(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(d);
  const g = (t: string): string => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}`;
}
function dateOnly(d: Date): string {
  return iso(d).slice(0, 10);
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

const NOW = iso(new Date());
const TODAY = dateOnly(new Date());

// ----- NIK generator: 16 digits, plausible structure -----
function makeNik(): string {
  // 6-digit area code (prov+kab+kec) + DDMMYY + 4-digit sequence = 16 digits.
  const wilayah = faker.helpers.arrayElement(["327301", "320403", "357801", "317101", "327502"]);
  const dd = String(faker.number.int({ min: 1, max: 28 })).padStart(2, "0");
  const mm = String(faker.number.int({ min: 1, max: 12 })).padStart(2, "0");
  const yy = String(faker.number.int({ min: 0, max: 99 })).padStart(2, "0");
  const seq = String(faker.number.int({ min: 1, max: 9999 })).padStart(4, "0");
  return `${wilayah}${dd}${mm}${yy}${seq}`;
}

const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const seed = db.transaction(() => {
  // ===== USERS =====
  const insUser = db.prepare(
    "INSERT INTO users (username, password_hash, role, nama, gaji, created_at) VALUES (?,?,?,?,?,?)",
  );
  const pwHash = (pw: string): string => hashSync(pw);
  insUser.run("asisten", pwHash("asisten"), "asisten", "Siti Rahayu", 2_500_000, NOW);
  insUser.run("perawat", pwHash("perawat"), "perawat", "Ns. Dewi Lestari, S.Kep.", 4_000_000, NOW);
  const asistenId = 1;
  const perawatId = 2;

  // ===== CLINIC SETTINGS (defaults mirror src/lib/config.ts) =====
  db.prepare(
    "INSERT INTO clinic_settings (id, nama, penanggung_jawab, sipp, alamat, kota, telepon, app_title, struk_footer, struk_footer2) VALUES (1,?,?,?,?,?,?,?,?,?)",
  ).run(
    "Praktik Keperawatan Mandiri Sehat Bersama",
    "Ns. Dewi Lestari, S.Kep.",
    "503/SIPP/2354/DPMPTSP/2024",
    "Jl. Melati Raya No. 14, Kel. Sukamaju",
    "Bandung",
    "0812-3456-7890",
    "HomeDoc",
    "Terima kasih atas kunjungan Anda. Semoga lekas sehat.",
    "",
  );

  // Practice schedule with sessions: weekdays pagi+sore, Sabtu pagi, Minggu tutup.
  const insSession = db.prepare(
    "INSERT INTO clinic_schedule_session (day, jam_buka, jam_tutup) VALUES (?,?,?)",
  );
  for (let day = 1; day <= 5; day++) {
    insSession.run(day, "08:00", "12:00");
    insSession.run(day, "16:00", "20:00");
  }
  insSession.run(6, "08:00", "14:00"); // Sabtu
  // Minggu (0): no sessions = tutup

  // ===== TREATMENTS =====
  const insTreat = db.prepare("INSERT INTO treatments (nama, harga, aktif) VALUES (?,?,1)");
  const treatments: Array<[string, number]> = [
    ["Jahit luka (per simpul)", 35_000],
    ["Perawatan luka / ganti perban", 40_000],
    ["Nebulisasi", 75_000],
    ["Injeksi intramuskular", 25_000],
    ["Pemasangan infus", 90_000],
    ["Tindik / cabut kuku", 120_000],
    ["EKG", 100_000],
    ["Pemeriksaan gula darah (stik)", 25_000],
    ["Tensi & pemeriksaan umum", 20_000],
    ["Sirkumsisi", 600_000],
  ];
  const treatmentIds: number[] = [];
  for (const [nama, harga] of treatments) {
    treatmentIds.push(Number(insTreat.run(nama, harga).lastInsertRowid));
  }

  // ===== MEDICINES + BATCHES =====
  const insMed = db.prepare(
    `INSERT INTO medicines (nama, merek, bentuk, satuan, harga_jual, obat_keras, is_consumable, supplier)
     VALUES (?,?,?,?,?,?,?,?)`,
  );
  const insBatch = db.prepare(
    `INSERT INTO medicine_batches (medicine_id, no_batch, tgl_kadaluarsa, qty, harga_beli, created_at)
     VALUES (?,?,?,?,?,?)`,
  );

  type MedSpec = {
    nama: string;
    merek: string | null;
    bentuk: string;
    satuan: string;
    harga: number;
    keras: 0 | 1;
  };
  const meds: MedSpec[] = [
    { nama: "Paracetamol 500mg", merek: "Sanmol", bentuk: "tablet", satuan: "tablet", harga: 1000, keras: 0 },
    { nama: "Amoxicillin 500mg", merek: "Yusimox", bentuk: "kapsul", satuan: "kapsul", harga: 2500, keras: 1 },
    { nama: "Amlodipine 5mg", merek: "Norvask", bentuk: "tablet", satuan: "tablet", harga: 1500, keras: 1 },
    { nama: "Metformin 500mg", merek: "Glucophage", bentuk: "tablet", satuan: "tablet", harga: 1200, keras: 1 },
    { nama: "Cetirizine 10mg", merek: "Incidal", bentuk: "tablet", satuan: "tablet", harga: 1800, keras: 0 },
    { nama: "Omeprazole 20mg", merek: "Losec", bentuk: "kapsul", satuan: "kapsul", harga: 2200, keras: 1 },
    { nama: "Ibuprofen 400mg", merek: "Proris", bentuk: "tablet", satuan: "tablet", harga: 1300, keras: 0 },
    { nama: "Dexamethasone 0.5mg", merek: null, bentuk: "tablet", satuan: "tablet", harga: 900, keras: 1 },
    { nama: "Antasida Doen", merek: "Promag", bentuk: "tablet", satuan: "tablet", harga: 800, keras: 0 },
    { nama: "Ambroxol 30mg", merek: "Mucos", bentuk: "tablet", satuan: "tablet", harga: 1100, keras: 0 },
    { nama: "Salbutamol 2mg", merek: "Ventolin", bentuk: "tablet", satuan: "tablet", harga: 1400, keras: 1 },
    { nama: "Captopril 25mg", merek: null, bentuk: "tablet", satuan: "tablet", harga: 1000, keras: 1 },
    { nama: "Vitamin B Complex", merek: null, bentuk: "tablet", satuan: "tablet", harga: 700, keras: 0 },
    { nama: "Vitamin C 50mg", merek: "Xon-Ce", bentuk: "tablet", satuan: "tablet", harga: 600, keras: 0 },
    { nama: "Loperamide 2mg", merek: null, bentuk: "tablet", satuan: "tablet", harga: 1200, keras: 0 },
    { nama: "Ranitidine 150mg", merek: null, bentuk: "tablet", satuan: "tablet", harga: 1300, keras: 1 },
    { nama: "Ciprofloxacin 500mg", merek: "Baquinor", bentuk: "tablet", satuan: "tablet", harga: 3500, keras: 1 },
    { nama: "Paracetamol Sirup 120mg/5ml", merek: "Tempra", bentuk: "sirup", satuan: "botol", harga: 18_000, keras: 0 },
    { nama: "Amoxicillin Sirup 125mg/5ml", merek: null, bentuk: "sirup", satuan: "botol", harga: 22_000, keras: 1 },
    { nama: "OBH Combi", merek: "OBH", bentuk: "sirup", satuan: "botol", harga: 16_000, keras: 0 },
    { nama: "Ketokonazol Krim 2%", merek: "Mycoral", bentuk: "salep", satuan: "tube", harga: 24_000, keras: 0 },
    { nama: "Gentamicin Salep", merek: null, bentuk: "salep", satuan: "tube", harga: 15_000, keras: 1 },
    { nama: "Cendo Xitrol Tetes Mata", merek: "Cendo", bentuk: "tetes", satuan: "botol", harga: 35_000, keras: 1 },
    { nama: "Lidocaine 2% Injeksi", merek: null, bentuk: "injeksi", satuan: "ampul", harga: 8000, keras: 1 },
    { nama: "Dexamethasone Injeksi", merek: null, bentuk: "injeksi", satuan: "ampul", harga: 9000, keras: 1 },
  ];

  // Non-medicine consumables (BMHP)
  const consumables: MedSpec[] = [
    { nama: "Kasa Steril", merek: null, bentuk: "salep", satuan: "pak", harga: 5000, keras: 0 },
    { nama: "Spuit 3cc", merek: null, bentuk: "injeksi", satuan: "pcs", harga: 2000, keras: 0 },
    { nama: "Handscoon (sarung tangan)", merek: null, bentuk: "salep", satuan: "pasang", harga: 1500, keras: 0 },
  ];

  let medId = 0;
  const medicineIds: number[] = [];
  const allMeds = [
    ...meds.map((m) => ({ ...m, consumable: 0 as const })),
    ...consumables.map((m) => ({ ...m, consumable: 1 as const })),
  ];

  for (const m of allMeds) {
    medId = Number(
      insMed.run(
        m.nama,
        m.merek,
        m.bentuk,
        m.satuan,
        m.harga,
        m.keras,
        m.consumable,
        faker.helpers.arrayElement(["PBF Kimia Farma", "PBF Enseval", "PBF AAM", "PBF Bina San"]),
      ).lastInsertRowid,
    );
    if (m.consumable === 0) medicineIds.push(medId);

    // 1–3 batches per item with varied expiries so FEFO + near-expiry alerts fire.
    const batchCount = faker.number.int({ min: 1, max: 3 });
    for (let b = 0; b < batchCount; b++) {
      // Mix of: already expiring soon (<90d), mid-term, and long-dated.
      const expiryDays = faker.helpers.arrayElement([
        faker.number.int({ min: 15, max: 80 }), // near-expiry → amber alert
        faker.number.int({ min: 120, max: 300 }),
        faker.number.int({ min: 400, max: 720 }),
      ]);
      const qty =
        m.consumable === 1
          ? faker.number.int({ min: 10, max: 200 })
          : faker.helpers.arrayElement([
              faker.number.int({ min: 5, max: 18 }), // low stock candidate
              faker.number.int({ min: 40, max: 150 }),
            ]);
      insBatch.run(
        medId,
        `B${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
        dateOnly(daysFromNow(expiryDays)),
        qty,
        Math.round(m.harga * 0.6),
        NOW,
      );
    }
  }
  const totalMeds = allMeds.length;

  // ===== PATIENTS =====
  const insPatient = db.prepare(
    `INSERT INTO patients (no_rm, nik, nama, tgl_lahir, jenis_kelamin, alamat, telepon, jaminan, bpjs_no, alergi, agama, pekerjaan, pendidikan, status_nikah, riwayat_keluarga, merokok, alkohol, pola_makan, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const noRm = (n: number): string => String(n).padStart(6, "0");
  const agamaList = ["Islam", "Islam", "Islam", "Kristen", "Katolik", "Hindu", "Buddha"] as const;
  const pendidikanList = ["SD", "SMP", "SMA", "SMA", "D3", "S1", "S1", "S2"] as const;
  const pekerjaanList = [
    "Petani", "Wiraswasta", "Karyawan Swasta", "PNS", "Guru", "Pedagang",
    "Ibu Rumah Tangga", "Pelajar/Mahasiswa", "Buruh", "Sopir", "Pensiunan", "Perawat",
  ];
  const statusNikahList = ["Belum Menikah", "Menikah", "Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"] as const;
  const merokokList = ["Tidak Merokok", "Tidak Merokok", "Perokok Aktif", "Mantan Perokok"] as const;
  const alkoholList = ["Tidak", "Tidak", "Tidak", "Kadang-kadang", "Sering"] as const;
  const riwayatKeluargaList = [
    "Tidak ada keluhan keluarga", "Hipertensi (orang tua)", "Diabetes melitus (orang tua)",
    "Asma (saudara)", "Penyakit jantung (orang tua)", "Riwayat stroke keluarga", "Alergi keluarga",
  ];
  const polaMakanList = [
    "Teratur 3x sehari", "Tidak teratur", "Sering konsumsi gorengan", "Rendah garam",
    "Tinggi serat & sayur", "Sering makan pedas", "Kurang minum air putih",
  ];
  const patientIds: number[] = [];
  const usedNik = new Set<string>();
  for (let i = 0; i < 32; i++) {
    const sex = faker.helpers.arrayElement(["L", "P"] as const);
    const nama = faker.person.fullName({ sex: sex === "L" ? "male" : "female" });
    let nik = makeNik();
    while (usedNik.has(nik)) nik = makeNik();
    usedNik.add(nik);
    const jaminan = faker.helpers.arrayElement(["umum", "umum", "bpjs"] as const);
    const punyaAlergi = faker.datatype.boolean({ probability: 0.18 });
    const alergi = punyaAlergi
      ? faker.helpers.arrayElement([
          "Alergi Penisilin",
          "Alergi Amoxicillin",
          "Alergi seafood",
          "Alergi sulfa",
          "Alergi debu",
        ])
      : null;
    const id = Number(
      insPatient.run(
        noRm(i + 1),
        nik,
        nama,
        dateOnly(faker.date.birthdate({ min: 1, max: 80, mode: "age" })),
        sex,
        `${faker.location.streetAddress()}, ${faker.location.city()}`,
        faker.phone.number({ style: "national" }),
        jaminan,
        jaminan === "bpjs" ? faker.string.numeric(13) : null,
        alergi,
        faker.helpers.arrayElement(agamaList),
        faker.helpers.arrayElement(pekerjaanList),
        faker.helpers.arrayElement(pendidikanList),
        faker.helpers.arrayElement(statusNikahList),
        faker.helpers.arrayElement(riwayatKeluargaList),
        faker.helpers.arrayElement(merokokList),
        faker.helpers.arrayElement(alkoholList),
        faker.helpers.arrayElement(polaMakanList),
        NOW,
      ).lastInsertRowid,
    );
    patientIds.push(id);
  }

  // ===== PAST VISITS (history for dashboard charts + reports) =====
  const insVisit = db.prepare(
    `INSERT INTO visits (patient_id, tanggal, nomor_antrian, status, keluhan_utama,
        td_sistol, td_diastol, suhu, berat, tinggi, created_by, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insIntervention = db.prepare(
    "INSERT INTO visit_interventions (visit_id, kategori, label, created_at) VALUES (?,?,?,?)",
  );
  const insSoap = db.prepare(
    `INSERT INTO soap_notes (visit_id, subjective, objective, assessment, plan, doctor_id, created_at, amends_id)
     VALUES (?,?,?,?,?,?,?,NULL)`,
  );
  const insAccess = db.prepare(
    "INSERT INTO record_access_log (visit_id, user_id, action, detail, created_at) VALUES (?,?,?,?,?)",
  );
  const insBill = db.prepare(
    `INSERT INTO bills (visit_id, jaminan, subtotal, diskon, total, status, metode, dibayar, kembalian, paid_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insBillItem = db.prepare(
    `INSERT INTO bill_items (bill_id, tipe, ref_id, deskripsi, qty, harga_satuan, subtotal)
     VALUES (?,?,?,?,?,?,?)`,
  );
  const insPresc = db.prepare(
    "INSERT INTO prescriptions (visit_id, medicine_id, qty, aturan_pakai, created_at) VALUES (?,?,?,?,?)",
  );

  const keluhanList = [
    "Demam 3 hari",
    "Batuk berdahak",
    "Sakit kepala",
    "Nyeri ulu hati",
    "Pusing dan lemas",
    "Gatal-gatal di kulit",
    "Nyeri tenggorokan",
    "Diare sejak kemarin",
    "Kontrol tekanan darah",
    "Nyeri pinggang",
  ];

  // Asuhan keperawatan catalog (mirrors src/lib/nursing.ts) for nurse-handled visits.
  const masalahList = [
    "Nyeri akut", "Hipertermi", "Nausea", "Resiko infeksi", "Gg rasa nyaman",
    "Kerusakan integritas kulit", "Diare", "Defisit pengetahuan",
  ];
  const etiologiList = [
    "Agen cedera fisik/biologis", "Prosedur invasif", "Asupan diet tidak adekuat",
    "Peningkatan suhu tubuh", "Perubahan frekuensi nafas",
  ];
  const intervensiList = [
    "Lakukan manajemen nyeri", "Lakukan monitoring vital sign", "Berikan minuman secukupnya",
    "Lakukan perawatan luka", "Monitoring gejala infeksi", "Lakukan konseling",
    "Berikan informasi tentang masalah, penyebab, dan rencana antisipasi",
  ];

  // Unique queue number per day (UNIQUE(tanggal, nomor_antrian)).
  let visitCount = 0;
  const nomorByDate = new Map<string, number>();
  const nextNomor = (date: string): number => {
    const n = (nomorByDate.get(date) ?? 0) + 1;
    nomorByDate.set(date, n);
    return n;
  };

  const makePastVisit = (pid: number, d: number): void => {
      const visitDate = dateOnly(daysAgo(d));
      const createdTs = iso(daysAgo(d));
      const n = nextNomor(visitDate);
      const vId = Number(
        insVisit.run(
          pid,
          visitDate,
          n,
          "selesai",
          faker.helpers.arrayElement(keluhanList),
          faker.number.int({ min: 100, max: 150 }),
          faker.number.int({ min: 65, max: 95 }),
          faker.number.float({ min: 36, max: 38.5, fractionDigits: 1 }),
          faker.number.float({ min: 45, max: 90, fractionDigits: 1 }),
          faker.number.int({ min: 150, max: 180 }),
          asistenId,
          createdTs,
        ).lastInsertRowid,
      );

      // Every visit is handled by the nurse: asuhan keperawatan (no ICD-10).
      const masalah = faker.helpers.arrayElements(masalahList, faker.number.int({ min: 1, max: 2 }));
      const intervensi = faker.helpers.arrayElements(intervensiList, faker.number.int({ min: 2, max: 3 }));
      for (const m of masalah) insIntervention.run(vId, "masalah", m, createdTs);
      insIntervention.run(vId, "etiologi", faker.helpers.arrayElement(etiologiList), createdTs);
      for (const it of intervensi) insIntervention.run(vId, "intervensi", it, createdTs);
      insSoap.run(
        vId,
        faker.helpers.arrayElement(keluhanList),
        "Keadaan umum baik, compos mentis.",
        masalah.join(", "),
        "Asuhan keperawatan sesuai intervensi, edukasi pasien.",
        perawatId,
        createdTs,
      );
      insAccess.run(vId, perawatId, "create", "Membuat asuhan keperawatan", createdTs);

      // Bill: konsultasi + (sometimes) obat/tindakan. All past bills are lunas.
      const items: Array<{ tipe: string; ref: number | null; desk: string; qty: number; harga: number }> = [
        { tipe: "konsultasi", ref: null, desk: "Biaya konsultasi keperawatan", qty: 1, harga: 50_000 },
      ];
      if (faker.datatype.boolean({ probability: 0.7 })) {
        const qty = faker.number.int({ min: 5, max: 15 });
        const harga = faker.number.int({ min: 800, max: 2500 });
        items.push({ tipe: "obat", ref: null, desk: "Obat (paket resep)", qty, harga });
        // Record prescription rows so fast-moving / drug-usage reports have data.
        const obatCount = faker.number.int({ min: 1, max: 2 });
        for (let o = 0; o < obatCount; o++) {
          insPresc.run(
            vId,
            faker.helpers.arrayElement(medicineIds),
            faker.number.int({ min: 3, max: 12 }),
            faker.helpers.arrayElement(["3x1 sesudah makan", "2x1 sebelum makan", "1x1 malam hari"]),
            createdTs,
          );
        }
      }
      if (faker.datatype.boolean({ probability: 0.25 })) {
        const t = faker.helpers.arrayElement(treatments);
        items.push({ tipe: "tindakan", ref: null, desk: t[0], qty: 1, harga: t[1] });
      }
      const subtotal = items.reduce((s, it) => s + it.qty * it.harga, 0);
      const metode = faker.helpers.arrayElement(["tunai", "transfer", "qris"] as const);
      const jaminan = faker.helpers.arrayElement(["umum", "umum", "bpjs"] as const);
      const dibayar = metode === "tunai" ? Math.ceil(subtotal / 5000) * 5000 : subtotal;
      const billId = Number(
        insBill.run(
          vId,
          jaminan,
          subtotal,
          0,
          subtotal,
          "lunas",
          metode,
          dibayar,
          dibayar - subtotal,
          createdTs,
          createdTs,
        ).lastInsertRowid,
      );
      for (const it of items) {
        insBillItem.run(billId, it.tipe, it.ref, it.desk, it.qty, it.harga, it.qty * it.harga);
      }
      visitCount++;
  };

  // Daily spread over the last 60 days (dashboard charts + reports).
  for (let d = 60; d >= 1; d--) {
    const visitsToday = faker.number.int({ min: 1, max: 6 });
    for (let i = 0; i < visitsToday; i++) makePastVisit(faker.helpers.arrayElement(patientIds), d);
  }
  // Guarantee every patient a personal history of several visits.
  for (const pid of patientIds) {
    const extra = faker.number.int({ min: 3, max: 7 });
    for (let i = 0; i < extra; i++) makePastVisit(pid, faker.number.int({ min: 1, max: 60 }));
  }

  // ===== EXPENSES (for laporan) =====
  const insExpense = db.prepare(
    "INSERT INTO expenses (tanggal, kategori, deskripsi, jumlah, created_by, created_at) VALUES (?,?,?,?,?,?)",
  );
  for (let d = 25; d >= 1; d -= 5) {
    insExpense.run(
      dateOnly(daysAgo(d)),
      faker.helpers.arrayElement(["Pembelian obat", "Operasional", "Listrik & air", "Gaji"]),
      faker.helpers.arrayElement(["Restock obat dari PBF", "Bayar listrik praktik", "ATK & administrasi"]),
      faker.number.int({ min: 100_000, max: 2_000_000 }),
      asistenId,
      iso(daysAgo(d)),
    );
  }

  return { totalMeds, patients: patientIds.length, visits: visitCount };
});

const result = seed();
db.close();

console.log("✓ Seed selesai:");
console.log(`  Pasien     : ${result.patients}`);
console.log(`  Obat/BMHP  : ${result.totalMeds}`);
console.log(`  Kunjungan  : ${result.visits}`);
console.log(`  Login      : asisten / asisten   |   perawat / perawat`);
console.log(`  Tanggal    : data berbasis ${TODAY} (WIB ${TZ_OFFSET})`);
