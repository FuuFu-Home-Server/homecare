import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/client";
import { nowWIB } from "@/lib/format";
import type { CreateUserInput, Role, UpdateUserInput, User } from "@/types";

/** Raw row shape as stored (snake_case). Includes the hash for auth only. */
interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  nama: string;
  telepon: string | null;
  info: string | null;
  alamat: string | null;
  tanggal_mulai: string | null;
  pembayaran: string | null;
  gaji: number | null;
  aktif: number;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    nama: row.nama,
    telepon: row.telepon,
    info: row.info,
    alamat: row.alamat,
    tanggalMulai: row.tanggal_mulai,
    pembayaran: row.pembayaran,
    gaji: row.gaji,
    aktif: row.aktif === 1,
    createdAt: row.created_at,
  };
}

export function findUserByUsername(username: string): (User & { passwordHash: string }) | null {
  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash };
}

export function findUserById(id: number): User | null {
  const row = getDb().prepare<[number], UserRow>("SELECT * FROM users WHERE id = ?").get(id);
  return row ? toUser(row) : null;
}

export function findUserByRole(role: Role): User | null {
  const row = getDb()
    .prepare<[Role], UserRow>("SELECT * FROM users WHERE role = ? AND aktif = 1 ORDER BY id LIMIT 1")
    .get(role);
  return row ? toUser(row) : null;
}

/** Staff list for management. */
export function listUsers(): User[] {
  return getDb()
    .prepare<[], UserRow>("SELECT * FROM users ORDER BY role DESC, id ASC")
    .all()
    .map(toUser);
}

export function createUser(input: CreateUserInput): User {
  const db = getDb();
  const res = db
    .prepare<
      [
        string,
        string,
        Role,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number | null,
        string,
      ]
    >(
      `INSERT INTO users (username, password_hash, role, nama, telepon, info, alamat, tanggal_mulai, pembayaran, gaji, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.username,
      bcrypt.hashSync(input.password, 10),
      input.role,
      input.nama,
      input.telepon,
      input.info,
      input.alamat,
      input.tanggalMulai,
      input.pembayaran,
      input.gaji,
      nowWIB(),
    );
  const created = findUserById(Number(res.lastInsertRowid));
  if (!created) throw new Error("Gagal membuat pengguna.");
  return created;
}

export function updateUserProfile(id: number, nama: string): void {
  getDb().prepare<[string, number]>("UPDATE users SET nama = ? WHERE id = ?").run(nama, id);
}

/** Full staff edit (Manajemen Staf): name, role, and contact/payment info. */
export function updateUser(id: number, input: UpdateUserInput): void {
  getDb()
    .prepare<
      [
        string,
        Role,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number | null,
        number,
      ]
    >(
      "UPDATE users SET nama = ?, role = ?, telepon = ?, info = ?, alamat = ?, tanggal_mulai = ?, pembayaran = ?, gaji = ? WHERE id = ?",
    )
    .run(
      input.nama,
      input.role,
      input.telepon,
      input.info,
      input.alamat,
      input.tanggalMulai,
      input.pembayaran,
      input.gaji,
      id,
    );
}

export function verifyUserPassword(id: number, password: string): boolean {
  const row = getDb()
    .prepare<[number], { password_hash: string }>("SELECT password_hash FROM users WHERE id = ?")
    .get(id);
  return row ? bcrypt.compareSync(password, row.password_hash) : false;
}

export function setUserPassword(id: number, password: string): void {
  getDb()
    .prepare<[string, number]>("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(bcrypt.hashSync(password, 10), id);
}

export function setUserActive(id: number, aktif: boolean): void {
  getDb().prepare<[number, number]>("UPDATE users SET aktif = ? WHERE id = ?").run(aktif ? 1 : 0, id);
}

export function deleteUser(id: number): void {
  getDb().prepare<[number]>("DELETE FROM users WHERE id = ?").run(id);
}

export function isUsernameTaken(username: string): boolean {
  return !!getDb()
    .prepare<[string], { id: number }>("SELECT id FROM users WHERE username = ?")
    .get(username);
}
