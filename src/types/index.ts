/**
 * Centralized domain types. Shared across hooks, components, and the db layer.
 * Enums are literal unions, never loose strings.
 */

// ===== Enums =====
export type Role = "asisten" | "perawat";
export type InterventionKategori = "masalah" | "etiologi" | "intervensi";
export type Agama = "Islam" | "Kristen" | "Katolik" | "Hindu" | "Buddha" | "Konghucu";
export type Pendidikan = "Tidak Sekolah" | "SD" | "SMP" | "SMA" | "D3" | "S1" | "S2" | "S3";
export type StatusNikah = "Belum Menikah" | "Menikah" | "Cerai Hidup" | "Cerai Mati";
export type Merokok = "Tidak Merokok" | "Perokok Aktif" | "Mantan Perokok";
export type Alkohol = "Tidak" | "Kadang-kadang" | "Sering";
export type JenisKelamin = "L" | "P";
export type Jaminan = "umum" | "bpjs";
export type AntrianStatus = "terdaftar" | "tiba" | "diperiksa" | "selesai" | "batal";
export type BentukObat = "tablet" | "sirup" | "injeksi" | "kapsul" | "salep" | "tetes";
export type StockTipe = "masuk" | "keluar" | "penyesuaian";
export type BillItemTipe = "konsultasi" | "obat" | "tindakan";
export type BillStatus = "draft" | "tertunda" | "lunas" | "batal";
export type MetodeBayar = "tunai" | "transfer" | "qris";
export type AccessAction = "view" | "create" | "amend";

// ===== Entities =====
export interface User {
  id: number;
  username: string;
  role: Role;
  nama: string;
  telepon: string | null;
  info: string | null;
  alamat: string | null;
  tanggalMulai: string | null;
  pembayaran: string | null;
  gaji: number | null;
  aktif: boolean;
  createdAt: string;
}

export interface ScheduleSession {
  jamBuka: string; // "HH:MM"
  jamTutup: string; // "HH:MM"
}

export interface ScheduleDay {
  day: number; // 0 = Minggu .. 6 = Sabtu
  sessions: ScheduleSession[]; // empty = tutup
}

export interface ScheduleStatus {
  open: boolean;
  /** All of today's open sessions (empty when closed today). */
  today: ScheduleSession[];
}

export type SessionStatus = "passed" | "active" | "upcoming";

export interface TodaySession {
  index: number;
  jamBuka: string;
  jamTutup: string;
  status: SessionStatus;
}

export interface CreateUserInput {
  username: string;
  nama: string;
  role: Role;
  password: string;
  telepon: string | null;
  info: string | null;
  alamat: string | null;
  tanggalMulai: string | null;
  pembayaran: string | null;
  gaji: number | null;
}

export interface UpdateUserInput {
  nama: string;
  role: Role;
  telepon: string | null;
  info: string | null;
  alamat: string | null;
  tanggalMulai: string | null;
  pembayaran: string | null;
  gaji: number | null;
}

export interface PayrollRow {
  userId: number;
  nama: string;
  role: Role;
  gaji: number | null;
  status: "lunas" | "belum";
  jumlah: number | null;
  paidAt: string | null;
}

export interface Patient {
  id: number;
  noRm: string;
  nik: string;
  nama: string;
  tglLahir: string;
  jenisKelamin: JenisKelamin;
  alamat: string | null;
  telepon: string | null;
  jaminan: Jaminan;
  bpjsNo: string | null;
  alergi: string | null;
  agama: Agama | null;
  pekerjaan: string | null;
  pendidikan: Pendidikan | null;
  statusNikah: StatusNikah | null;
  riwayatKeluarga: string | null;
  merokok: Merokok | null;
  alkohol: Alkohol | null;
  polaMakan: string | null;
  createdAt: string;
}

export interface Visit {
  id: number;
  patientId: number;
  tanggal: string;
  nomorAntrian: number;
  status: AntrianStatus;
  keluhanUtama: string | null;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
  createdBy: number;
  createdAt: string;
}

export interface SoapNote {
  id: number;
  visitId: number;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  doctorId: number;
  createdAt: string;
  amendsId: number | null;
}

export interface VisitIntervention {
  id: number;
  visitId: number;
  kategori: InterventionKategori;
  label: string;
  createdAt: string;
}

export interface RecordAccessLog {
  id: number;
  visitId: number;
  userId: number;
  action: AccessAction;
  detail: string | null;
  createdAt: string;
}

export interface Medicine {
  id: number;
  nama: string;
  merek: string | null;
  bentuk: BentukObat;
  satuan: string;
  hargaJual: number;
  obatKeras: boolean;
  isConsumable: boolean;
  supplier: string | null;
}

export interface MedicineBatch {
  id: number;
  medicineId: number;
  noBatch: string;
  tglKadaluarsa: string;
  qty: number;
  hargaBeli: number | null;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  batchId: number;
  visitId: number | null;
  tipe: StockTipe;
  qty: number;
  alasan: string | null;
  createdBy: number;
  createdAt: string;
}

export interface Treatment {
  id: number;
  nama: string;
  harga: number;
  aktif: boolean;
}

export interface Prescription {
  id: number;
  visitId: number;
  medicineId: number;
  qty: number;
  aturanPakai: string | null;
  createdAt: string;
}

export interface Bill {
  id: number;
  visitId: number;
  jaminan: Jaminan;
  subtotal: number;
  diskon: number;
  total: number;
  status: BillStatus;
  metode: MetodeBayar | null;
  dibayar: number | null;
  kembalian: number | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BillItem {
  id: number;
  billId: number;
  tipe: BillItemTipe;
  refId: number | null;
  deskripsi: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
}

export interface Expense {
  id: number;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
  createdBy: number;
  createdAt: string;
}

// ===== Input shapes =====
export interface CreatePatientInput {
  nik: string;
  nama: string;
  tglLahir: string;
  jenisKelamin: JenisKelamin;
  alamat: string | null;
  telepon: string | null;
  jaminan: Jaminan;
  bpjsNo: string | null;
  alergi: string | null;
  agama: Agama | null;
  pekerjaan: string | null;
  pendidikan: Pendidikan | null;
  statusNikah: StatusNikah | null;
  riwayatKeluarga: string | null;
  merokok: Merokok | null;
  alkohol: Alkohol | null;
  polaMakan: string | null;
}

export interface VitalsInput {
  keluhanUtama: string;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
}

export interface SoapInput {
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  amendsId: number | null;
}

export interface PrescriptionInput {
  medicineId: number;
  qty: number;
  aturanPakai: string | null;
}

// ===== Composite view models =====
export interface MedicineStock extends Medicine {
  totalQty: number;
  nearestExpiry: string | null;
  batchCount: number;
}

export interface PrescriptionView {
  id: number;
  visitId: number;
  medicineId: number;
  qty: number;
  aturanPakai: string | null;
  createdAt: string;
  nama: string;
  satuan: string;
  hargaJual: number;
}

export interface DispenseWarning {
  nama: string;
  tipe: "near-expiry" | "shortfall";
  detail: string;
}

export interface DispenseResult {
  warnings: DispenseWarning[];
}

export interface NameCount {
  label: string;
  count: number;
}

export interface FinancialReport {
  pendapatan: number;
  pengeluaran: number;
  laba: number;
  byMetode: Record<MetodeBayar, number>;
  byJaminan: Record<Jaminan, number>;
  dailyRevenue: TrendPoint[];
  jumlahTransaksi: number;
}

export interface TransactionRow {
  id: number;
  paidAt: string;
  pasien: string;
  metode: MetodeBayar | null;
  jaminan: Jaminan;
  total: number;
}

export interface ExpenseRow {
  id: number;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  jumlah: number;
}

export interface ClinicalReport {
  totalKunjungan: number;
  topTreatments: NameCount[];
  visitTrend: TrendPoint[];
}

export interface InventoryReport {
  nilaiStok: number;
  lowStockCount: number;
  nearExpiryCount: number;
  fastMoving: NameCount[];
  nearExpiry: NearExpiryItem[];
}

export interface CreateMedicineInput {
  nama: string;
  merek: string | null;
  bentuk: BentukObat;
  satuan: string;
  hargaJual: number;
  obatKeras: boolean;
  isConsumable: boolean;
  supplier: string | null;
}

export interface AddBatchInput {
  noBatch: string;
  tglKadaluarsa: string;
  qty: number;
  hargaBeli: number | null;
}

export interface StockMovementView {
  id: number;
  tipe: StockTipe;
  qty: number;
  alasan: string | null;
  createdAt: string;
  noBatch: string;
  tglKadaluarsa: string;
}

export interface MedicineDetailBundle {
  medicine: MedicineStock;
  batches: MedicineBatch[];
  movements: StockMovementView[];
}

export interface BillBundle {
  bill: Bill;
  items: BillItem[];
  entry: QueueEntry;
  patient: Patient;
}

/** A visit awaiting payment, shown in the kasir queue. */
export interface KasirEntry {
  visitId: number;
  nomorAntrian: number;
  nama: string;
  jaminan: Jaminan;
  status: AntrianStatus;
  billStatus: BillStatus | null;
  total: number | null;
}

export interface ConsultBundle {
  entry: QueueEntry;
  patient: Patient;
  soapNotes: SoapNote[];
  interventions: VisitIntervention[];
  prescriptions: PrescriptionView[];
  accessLog: RecordAccessLog[];
}


/** A queue row joined with its patient — what the antrian/consult screens show. */
export interface QueueEntry {
  visitId: number;
  nomorAntrian: number;
  status: AntrianStatus;
  keluhanUtama: string | null;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  berat: number | null;
  tinggi: number | null;
  tanggal: string;
  createdAt: string;
  patientId: number;
  nama: string;
  noRm: string;
  nik: string;
  tglLahir: string;
  jenisKelamin: JenisKelamin;
  jaminan: Jaminan;
  alergi: string | null;
  hasVitals: boolean;
}

export interface PatientHistoryItem {
  visitId: number;
  tanggal: string;
  status: AntrianStatus;
  keluhanUtama: string | null;
  diagnoses: string;
  total: number | null;
  billStatus: BillStatus | null;
}

export interface MedicalRecordExportRow {
  // Patient demographics
  tanggal: string;
  noRm: string;
  nik: string;
  pasien: string;
  tglLahir: string;
  umur: number;
  jenisKelamin: JenisKelamin;
  jaminan: Jaminan;
  bpjsNo: string;
  alamat: string;
  telepon: string;
  agama: string;
  pekerjaan: string;
  pendidikan: string;
  statusNikah: string;
  alergi: string;
  riwayatKeluarga: string;
  merokok: string;
  alkohol: string;
  polaMakan: string;
  // Clinical detail, one section per column
  keluhan: string;
  status: AntrianStatus;
  td: string;
  suhu: string;
  berat: string;
  tinggi: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  masalah: string;
  etiologi: string;
  intervensi: string;
  resep: string;
  tindakan: string;
}

// ===== Dashboard / reporting view models =====
export interface LowStockItem {
  medicineId: number;
  nama: string;
  satuan: string;
  totalQty: number;
}

export interface NearExpiryItem {
  batchId: number;
  medicineId: number;
  nama: string;
  noBatch: string;
  tglKadaluarsa: string;
  qty: number;
  sisaHari: number;
}

export interface TrendPoint {
  tanggal: string;
  value: number;
}

export interface DashboardData {
  antrianHariIni: number;
  antrianAktif: number;
  pendapatanHariIni: number;
  pendapatanBulanIni: number;
  jumlahPasien: number;
  tagihanTertundaCount: number;
  tagihanTertundaTotal: number;
  lowStock: LowStockItem[];
  nearExpiry: NearExpiryItem[];
  revenueTrend: TrendPoint[];
  visitTrend: TrendPoint[];
}

export interface CashClosing {
  id: number;
  tanggal: string;
  totalTunai: number;
  totalTransfer: number;
  totalQris: number;
  totalPengeluaran: number;
  saldo: number;
  closedBy: number;
  closedAt: string;
}

// ===== Desktop IPC bridge =====
// Shared contract between the Electron preload bridge, the main dispatcher, and
// the renderer fetcher. On desktop the renderer reaches the repositories over
// this bridge instead of HTTP.
export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: ApiMethod;
  path: string;
  body?: unknown;
}

export interface ApiResponse {
  status: number;
  data: unknown;
}

export interface HomeCareBridge {
  platform: string;
  invoke(request: ApiRequest): Promise<ApiResponse>;
  /** Open the OS print dialog for the current document (physical or save-as-PDF). */
  print(): Promise<void>;
  /** Render the document to PDF and prompt for a save location. Returns saved. */
  printToPdf(filename: string): Promise<boolean>;
}
