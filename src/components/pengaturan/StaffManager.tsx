"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/components/ui/Toast";
import { IconPlus } from "@/components/layout/icons";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { rupiah } from "@/lib/format";
import type { Role, User } from "@/types";

const ROLE_LABEL: Record<Role, string> = {
  asisten: "Asisten",
  perawat: "Perawat",
};

const ROLE_TONE: Record<Role, "brand" | "info" | "neutral"> = {
  asisten: "neutral",
  perawat: "info",
};

const ROLE_OPTIONS: ReadonlyArray<{ value: Role; label: string }> = [
  { value: "asisten", label: "Asisten" },
  { value: "perawat", label: "Perawat" },
];

export interface StaffManagerProps {
  currentUserId: number;
}

export function StaffManager({ currentUserId }: StaffManagerProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [pwTarget, setPwTarget] = useState<User | null>(null);
  const [delTarget, setDelTarget] = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<{ users: User[] }>("/api/users");
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat staf.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleActive(u: User): Promise<void> {
    try {
      await patchJson(`/api/users/${u.id}`, { aktif: !u.aktif });
      toast(u.aktif ? "Akun dinonaktifkan" : "Akun diaktifkan");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", "error");
    }
  }

  const columns = useMemo<Column<User>[]>(
    () => [
      { id: "nama", header: "Nama", value: (u) => u.nama, sortable: true },
      { id: "username", header: "Username", value: (u) => u.username },
      { id: "telepon", header: "Telepon", value: (u) => u.telepon ?? "—" },
      {
        id: "gaji",
        header: "Gaji",
        align: "right",
        sortable: true,
        value: (u) => u.gaji ?? 0,
        render: (u) => (u.gaji != null ? rupiah(u.gaji) : "—"),
      },
      {
        id: "role",
        header: "Peran",
        filter: "select",
        value: (u) => ROLE_LABEL[u.role],
        render: (u) => <StatusPill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</StatusPill>,
      },
      {
        id: "aktif",
        header: "Status",
        value: (u) => (u.aktif ? "Aktif" : "Nonaktif"),
        render: (u) => (
          <StatusPill tone={u.aktif ? "success" : "danger"}>{u.aktif ? "Aktif" : "Nonaktif"}</StatusPill>
        ),
      },
      {
        id: "aksi",
        header: "",
        align: "right",
        render: (u) => (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                { label: "Edit", onClick: () => setEditTarget(u) },
                { label: "Reset Password", onClick: () => setPwTarget(u) },
                {
                  label: u.aktif ? "Nonaktifkan" : "Aktifkan",
                  onClick: () => (u.aktif ? setDeactivateTarget(u) : toggleActive(u)),
                  disabled: u.id === currentUserId,
                },
                {
                  label: "Hapus",
                  tone: "danger",
                  onClick: () => setDelTarget(u),
                  disabled: u.id === currentUserId,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [currentUserId],
  );

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
          Tambah Staf
        </Button>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        getRowId={(u) => u.id}
        searchPlaceholder="Cari staf…"
        emptyTitle="Belum ada staf"
      />

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} onDone={refresh} />

      <EditStaffModal user={editTarget} onClose={() => setEditTarget(null)} onDone={refresh} />

      <ResetPasswordModal user={pwTarget} onClose={() => setPwTarget(null)} />

      <ConfirmDialog
        open={delTarget !== null}
        onClose={() => setDelTarget(null)}
        onConfirm={async () => {
          if (!delTarget) return;
          try {
            await deleteJson(`/api/users/${delTarget.id}`);
            toast("Staf dihapus");
            await refresh();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Gagal menghapus", "error");
          }
        }}
        title="Hapus Staf"
        message={`Hapus akun ${delTarget?.nama ?? ""}? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (deactivateTarget) await toggleActive(deactivateTarget);
        }}
        title="Nonaktifkan Staf"
        message={`Nonaktifkan akun ${deactivateTarget?.nama ?? ""}? Akun tidak bisa login sampai diaktifkan lagi.`}
        confirmLabel="Nonaktifkan"
      />
    </>
  );
}

function AddStaffModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<Role>("asisten");
  const [telepon, setTelepon] = useState("");
  const [info, setInfo] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [pembayaran, setPembayaran] = useState("");
  const [gaji, setGaji] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setUsername("");
      setNama("");
      setRole("asisten");
      setTelepon("");
      setInfo("");
      setAlamat("");
      setTanggalMulai("");
      setPembayaran("");
      setGaji("");
      setPassword("");
      setError(null);
    }
  }

  const usernameErr =
    username.length > 0 && !/^[a-z0-9_.]{3,}$/.test(username)
      ? "Min. 3 karakter (huruf, angka, titik, garis bawah)."
      : null;
  const passwordErr = password.length > 0 && password.length < 4 ? "Minimal 4 karakter." : null;
  const valid =
    nama.trim() !== "" && /^[a-z0-9_.]{3,}$/.test(username) && password.length >= 4;

  async function submit(): Promise<void> {
    setError(null);
    if (!valid) return;
    setBusy(true);
    try {
      await postJson("/api/users", {
        username,
        nama,
        role,
        password,
        telepon,
        info,
        alamat,
        tanggalMulai,
        pembayaran,
        gaji: gaji === "" ? null : Number(gaji),
      });
      toast("Staf ditambahkan");
      await onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah staf.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Staf"
      description="Buat akun staf baru (asisten atau perawat)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy} disabled={!valid}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_.]/gi, "").toLowerCase())}
          error={usernameErr ?? undefined}
          hint={usernameErr ? undefined : "Huruf/angka, minimal 3 karakter"}
        />
        <div>
          <Label>Peran</Label>
          <CustomSelect
            value={role}
            onChange={(v) => setRole(ROLE_OPTIONS.find((o) => o.value === v)?.value ?? "asisten")}
            options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <PasswordInput
          label="Password"
          meter
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordErr ?? undefined}
        />
        <Input label="Telepon (opsional)" value={telepon} onChange={(e) => setTelepon(e.target.value)} />
        <Textarea label="Alamat (opsional)" rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        <Input
          label="Tanggal Mulai Kerja (opsional)"
          type="date"
          value={tanggalMulai}
          onChange={(e) => setTanggalMulai(e.target.value)}
        />
        <Input label="Catatan (opsional)" value={info} onChange={(e) => setInfo(e.target.value)} />
        <Input
          label="Info Pembayaran (opsional)"
          value={pembayaran}
          onChange={(e) => setPembayaran(e.target.value)}
          hint="Mis. bank & nomor rekening untuk penggajian."
        />
        <MoneyInput
          label="Gaji (opsional)"
          value={gaji}
          onChange={setGaji}
          hint="Gaji pokok per bulan, dalam rupiah."
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

function EditStaffModal({
  user,
  onClose,
  onDone,
}: {
  user: User | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<Role>("asisten");
  const [telepon, setTelepon] = useState("");
  const [info, setInfo] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [pembayaran, setPembayaran] = useState("");
  const [gaji, setGaji] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedId, setSeedId] = useState<number | null>(null);
  if (user && user.id !== seedId) {
    setSeedId(user.id);
    setNama(user.nama);
    setRole(user.role);
    setTelepon(user.telepon ?? "");
    setInfo(user.info ?? "");
    setAlamat(user.alamat ?? "");
    setTanggalMulai(user.tanggalMulai ?? "");
    setPembayaran(user.pembayaran ?? "");
    setGaji(user.gaji != null ? String(user.gaji) : "");
    setError(null);
  }

  const valid = nama.trim() !== "";

  async function submit(): Promise<void> {
    if (!user) return;
    setError(null);
    if (!valid) return;
    setBusy(true);
    try {
      await patchJson(`/api/users/${user.id}`, {
        nama,
        role,
        telepon,
        info,
        alamat,
        tanggalMulai,
        pembayaran,
        gaji: gaji === "" ? null : Number(gaji),
      });
      toast("Staf diperbarui");
      await onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title="Edit Staf"
      description={user ? `@${user.username}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy} disabled={!valid}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Nama Lengkap" value={nama} onChange={(e) => setNama(e.target.value)} />
        <div>
          <Label>Peran</Label>
          <CustomSelect
            value={role}
            onChange={(v) => setRole(ROLE_OPTIONS.find((o) => o.value === v)?.value ?? "asisten")}
            options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        <Input label="Telepon (opsional)" value={telepon} onChange={(e) => setTelepon(e.target.value)} />
        <Textarea label="Alamat (opsional)" rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        <Input
          label="Tanggal Mulai Kerja (opsional)"
          type="date"
          value={tanggalMulai}
          onChange={(e) => setTanggalMulai(e.target.value)}
        />
        <Input label="Catatan (opsional)" value={info} onChange={(e) => setInfo(e.target.value)} />
        <Input
          label="Info Pembayaran (opsional)"
          value={pembayaran}
          onChange={(e) => setPembayaran(e.target.value)}
          hint="Mis. bank & nomor rekening untuk penggajian."
        />
        <MoneyInput
          label="Gaji (opsional)"
          value={gaji}
          onChange={setGaji}
          hint="Gaji pokok per bulan, dalam rupiah."
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seedId, setSeedId] = useState<number | null>(null);
  if (user && user.id !== seedId) {
    setSeedId(user.id);
    setPassword("");
    setError(null);
  }

  async function submit(): Promise<void> {
    if (!user) return;
    setError(null);
    if (password.length < 4) return setError("Password minimal 4 karakter.");
    setBusy(true);
    try {
      await postJson(`/api/users/${user.id}/password`, { password });
      toast(`Password ${user.nama} direset`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title="Reset Password"
      description={user ? user.nama : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} loading={busy}>
            Reset
          </Button>
        </>
      }
    >
      <PasswordInput
        label="Password Baru"
        meter
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </Modal>
  );
}
