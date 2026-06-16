"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Label } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import { todayWIB } from "@/lib/format";
import type {
  Agama,
  Alkohol,
  CreatePatientInput,
  JenisKelamin,
  Jaminan,
  Merokok,
  Patient,
  Pendidikan,
  StatusNikah,
} from "@/types";

const STATUS_NIKAH_OPTIONS: ReadonlyArray<{ value: StatusNikah | ""; label: string }> = [
  { value: "", label: "— Pilih —" },
  { value: "Belum Menikah", label: "Belum Menikah" },
  { value: "Menikah", label: "Menikah" },
  { value: "Cerai Hidup", label: "Cerai Hidup" },
  { value: "Cerai Mati", label: "Cerai Mati" },
];

const MEROKOK_OPTIONS: ReadonlyArray<{ value: Merokok | ""; label: string }> = [
  { value: "", label: "— Pilih —" },
  { value: "Tidak Merokok", label: "Tidak Merokok" },
  { value: "Perokok Aktif", label: "Perokok Aktif" },
  { value: "Mantan Perokok", label: "Mantan Perokok" },
];

const ALKOHOL_OPTIONS: ReadonlyArray<{ value: Alkohol | ""; label: string }> = [
  { value: "", label: "— Pilih —" },
  { value: "Tidak", label: "Tidak" },
  { value: "Kadang-kadang", label: "Kadang-kadang" },
  { value: "Sering", label: "Sering" },
];

const AGAMA_OPTIONS: ReadonlyArray<{ value: Agama | ""; label: string }> = [
  { value: "", label: "— Pilih —" },
  { value: "Islam", label: "Islam" },
  { value: "Kristen", label: "Kristen" },
  { value: "Katolik", label: "Katolik" },
  { value: "Hindu", label: "Hindu" },
  { value: "Buddha", label: "Buddha" },
  { value: "Konghucu", label: "Konghucu" },
];

const PENDIDIKAN_OPTIONS: ReadonlyArray<{ value: Pendidikan | ""; label: string }> = [
  { value: "", label: "— Pilih —" },
  { value: "Tidak Sekolah", label: "Tidak Sekolah" },
  { value: "SD", label: "SD" },
  { value: "SMP", label: "SMP" },
  { value: "SMA", label: "SMA" },
  { value: "D3", label: "D3" },
  { value: "S1", label: "S1" },
  { value: "S2", label: "S2" },
  { value: "S3", label: "S3" },
];

export interface PatientRegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePatientInput) => Promise<void>;
  /** When set, the modal works in edit mode (prefilled). */
  patient?: Patient | null;
  defaultNik?: string;
}

interface FormState {
  nik: string;
  nama: string;
  tglLahir: string;
  jenisKelamin: JenisKelamin;
  jaminan: Jaminan;
  bpjsNo: string;
  alamat: string;
  telepon: string;
  agama: Agama | "";
  pekerjaan: string;
  pendidikan: Pendidikan | "";
  statusNikah: StatusNikah | "";
  riwayatKeluarga: string;
  merokok: Merokok | "";
  alkohol: Alkohol | "";
  polaMakan: string;
  alergi: string;
  hasAlergi: boolean;
}

function fromPatient(p: Patient | null | undefined, nik: string): FormState {
  return {
    nik: p?.nik ?? nik,
    nama: p?.nama ?? "",
    tglLahir: p?.tglLahir ?? "",
    jenisKelamin: p?.jenisKelamin ?? "L",
    jaminan: p?.jaminan ?? "umum",
    bpjsNo: p?.bpjsNo ?? "",
    alamat: p?.alamat ?? "",
    telepon: p?.telepon ?? "",
    agama: p?.agama ?? "",
    pekerjaan: p?.pekerjaan ?? "",
    pendidikan: p?.pendidikan ?? "",
    statusNikah: p?.statusNikah ?? "",
    riwayatKeluarga: p?.riwayatKeluarga ?? "",
    merokok: p?.merokok ?? "",
    alkohol: p?.alkohol ?? "",
    polaMakan: p?.polaMakan ?? "",
    alergi: p?.alergi ?? "",
    hasAlergi: !!p?.alergi,
  };
}

export function PatientRegisterModal({
  open,
  onClose,
  onSubmit,
  patient,
  defaultNik = "",
}: PatientRegisterModalProps) {
  const { toast } = useToast();
  const isEdit = !!patient;
  const [form, setForm] = useState<FormState>(fromPatient(patient, defaultNik));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-seed when a different patient (or fresh registration) is opened.
  const [seedKey, setSeedKey] = useState<number | null>(patient?.id ?? null);
  if (open && (patient?.id ?? null) !== seedKey) {
    setSeedKey(patient?.id ?? null);
    setForm(fromPatient(patient, defaultNik));
    setError(null);
  }

  const set = <K extends keyof FormState>(key: K, val: FormState[K]): void =>
    setForm((f) => ({ ...f, [key]: val }));

  // Live validation
  const nikErr =
    form.nik.length > 0 && !/^\d{16}$/.test(form.nik) ? "NIK harus tepat 16 digit." : null;
  const valid = /^\d{16}$/.test(form.nik) && form.nama.trim() !== "" && form.tglLahir !== "";

  async function submit(): Promise<void> {
    setError(null);
    if (!/^\d{16}$/.test(form.nik)) return setError("NIK harus 16 digit angka.");
    if (!form.nama.trim()) return setError("Nama wajib diisi.");
    if (!form.tglLahir) return setError("Tanggal lahir wajib diisi.");

    setBusy(true);
    try {
      await onSubmit({
        nik: form.nik.trim(),
        nama: form.nama.trim(),
        tglLahir: form.tglLahir,
        jenisKelamin: form.jenisKelamin,
        jaminan: form.jaminan,
        bpjsNo: form.jaminan === "bpjs" ? form.bpjsNo.trim() || null : null,
        alamat: form.alamat.trim() || null,
        telepon: form.telepon.trim() || null,
        agama: form.agama || null,
        pekerjaan: form.pekerjaan.trim() || null,
        pendidikan: form.pendidikan || null,
        statusNikah: form.statusNikah || null,
        riwayatKeluarga: form.riwayatKeluarga.trim() || null,
        merokok: form.merokok || null,
        alkohol: form.alkohol || null,
        polaMakan: form.polaMakan.trim() || null,
        alergi: form.hasAlergi ? form.alergi.trim() || "Ada alergi" : null,
      });
      toast(isEdit ? "Data pasien diperbarui" : "Pasien berhasil didaftarkan");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Data Pasien" : "Registrasi Pasien Baru"}
      description={isEdit ? form.nama : "Lengkapi data identitas pasien"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy} disabled={!valid}>
            {isEdit ? "Simpan Perubahan" : "Simpan Pasien"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="No. RM"
          value={patient ? patient.noRm : "Dibuat otomatis"}
          disabled
          hint={patient ? undefined : "Nomor rekam medis dibuat otomatis saat disimpan"}
        />
        <Input
          label="NIK (16 digit)"
          value={form.nik}
          inputMode="numeric"
          maxLength={16}
          onChange={(e) => set("nik", e.target.value.replace(/\D/g, ""))}
          placeholder="3273xxxxxxxxxxxx"
          error={nikErr ?? undefined}
        />
        <Input label="Nama Lengkap" value={form.nama} onChange={(e) => set("nama", e.target.value)} />
        <DatePicker
          label="Tanggal Lahir"
          value={form.tglLahir}
          onChange={(v) => set("tglLahir", v)}
          max={todayWIB()}
        />
        <div>
          <Label>Jenis Kelamin</Label>
          <CustomSelect
            value={form.jenisKelamin}
            onChange={(v) => set("jenisKelamin", v === "P" ? "P" : "L")}
            options={[
              { value: "L", label: "Laki-laki" },
              { value: "P", label: "Perempuan" },
            ]}
          />
        </div>
        <div>
          <Label>Jaminan</Label>
          <CustomSelect
            value={form.jaminan}
            onChange={(v) => set("jaminan", v === "bpjs" ? "bpjs" : "umum")}
            options={[
              { value: "umum", label: "Umum" },
              { value: "bpjs", label: "BPJS" },
            ]}
          />
        </div>
        {form.jaminan === "bpjs" ? (
          <Input
            label="No. BPJS"
            value={form.bpjsNo}
            inputMode="numeric"
            onChange={(e) => set("bpjsNo", e.target.value.replace(/\D/g, ""))}
          />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Input label="No. Telepon" value={form.telepon} onChange={(e) => set("telepon", e.target.value)} />
        <Input label="Alamat" value={form.alamat} onChange={(e) => set("alamat", e.target.value)} />

        <div>
          <Label>Agama</Label>
          <CustomSelect
            value={form.agama}
            onChange={(v) => set("agama", AGAMA_OPTIONS.find((o) => o.value === v)?.value ?? "")}
            options={AGAMA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <div>
          <Label>Pendidikan</Label>
          <CustomSelect
            value={form.pendidikan}
            onChange={(v) => set("pendidikan", PENDIDIKAN_OPTIONS.find((o) => o.value === v)?.value ?? "")}
            options={PENDIDIKAN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <Input
          label="Pekerjaan"
          value={form.pekerjaan}
          onChange={(e) => set("pekerjaan", e.target.value)}
          placeholder="cth. Wiraswasta"
        />

        <div className="sm:col-span-2 mt-1 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Riwayat & Gaya Hidup <span className="font-normal normal-case text-slate-400">(opsional)</span>
          </p>
        </div>
        <div>
          <Label>Status Pernikahan</Label>
          <CustomSelect
            value={form.statusNikah}
            onChange={(v) => set("statusNikah", STATUS_NIKAH_OPTIONS.find((o) => o.value === v)?.value ?? "")}
            options={STATUS_NIKAH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <div>
          <Label>Merokok</Label>
          <CustomSelect
            value={form.merokok}
            onChange={(v) => set("merokok", MEROKOK_OPTIONS.find((o) => o.value === v)?.value ?? "")}
            options={MEROKOK_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <div>
          <Label>Konsumsi Alkohol</Label>
          <CustomSelect
            value={form.alkohol}
            onChange={(v) => set("alkohol", ALKOHOL_OPTIONS.find((o) => o.value === v)?.value ?? "")}
            options={ALKOHOL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <Input
          label="Pola Makan"
          value={form.polaMakan}
          onChange={(e) => set("polaMakan", e.target.value)}
          placeholder="cth. Teratur 3x sehari"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Riwayat Penyakit Keluarga"
            rows={2}
            value={form.riwayatKeluarga}
            onChange={(e) => set("riwayatKeluarga", e.target.value)}
            placeholder="cth. Hipertensi (orang tua), diabetes"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.hasAlergi}
              onChange={(e) => set("hasAlergi", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Pasien memiliki alergi
          </label>
          {form.hasAlergi ? (
            <Input
              className="mt-2"
              value={form.alergi}
              onChange={(e) => set("alergi", e.target.value)}
              placeholder="cth. Alergi Penisilin, seafood"
            />
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </Modal>
  );
}
