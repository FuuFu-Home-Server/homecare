import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { hashSync } from "@node-rs/argon2";
import fs from "node:fs";
import path from "node:path";
import { currentDbPath } from "@/lib/db/client";

/**
 * On-device keystore for at-rest DB encryption.
 *
 * A single random 32-byte master key encrypts the SQLite DB (SQLCipher). The
 * master key never touches disk in the clear: it is wrapped (AES-256-GCM) by a
 * key-encryption-key derived from each user's password via Argon2id, plus once
 * by a one-time recovery key shown to the owner at setup. Login unwraps the
 * master key from the user's entry; a forgotten password is recoverable only
 * with the recovery key. The keystore.json sits beside the DB file.
 */

const KEY_LEN = 32;

function keystorePath(): string {
  return path.join(path.dirname(currentDbPath()), "keystore.json");
}

interface Wrapped {
  salt: string;
  nonce: string;
  ct: string;
  tag: string;
}

interface UserEntry extends Wrapped {
  username: string;
}

interface KeystoreFile {
  version: 1;
  users: UserEntry[];
  recovery: Wrapped;
}

/** KEK = sha256(argon2id(password, salt)). Argon2 is the memory-hard KDF; the
 * hash collapses its encoded output to a 32-byte AES key. Deterministic per
 * (password, salt). */
function kek(password: string, saltB64: string): Buffer {
  const encoded = hashSync(password, { salt: Buffer.from(saltB64, "base64") });
  return createHash("sha256").update(encoded).digest();
}

function wrapKey(masterKey: Buffer, password: string): Wrapped {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kek(password, salt.toString("base64")), nonce);
  const ct = Buffer.concat([cipher.update(masterKey), cipher.final()]);
  return {
    salt: salt.toString("base64"),
    nonce: nonce.toString("base64"),
    ct: ct.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function unwrapKey(w: Wrapped, password: string): Buffer | null {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      kek(password, w.salt),
      Buffer.from(w.nonce, "base64"),
    );
    decipher.setAuthTag(Buffer.from(w.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(w.ct, "base64")), decipher.final()]);
  } catch {
    return null; // wrong password / tampered ciphertext → auth tag mismatch
  }
}

function read(): KeystoreFile {
  return JSON.parse(fs.readFileSync(keystorePath(), "utf-8")) as KeystoreFile;
}

function write(file: KeystoreFile): void {
  fs.writeFileSync(keystorePath(), JSON.stringify(file), { mode: 0o600 });
}

/** True once at least one account exists — i.e. setup has run. */
export function keystoreExists(): boolean {
  try {
    return read().users.length > 0;
  } catch {
    return false;
  }
}

export interface InitResult {
  masterKey: Buffer;
  /** Show once to the owner; never stored in the clear. */
  recoveryKey: string;
}

export function initKeystore(username: string, password: string): InitResult {
  const masterKey = randomBytes(KEY_LEN);
  const recoveryKey = randomBytes(KEY_LEN).toString("base64url");
  write({
    version: 1,
    users: [{ username, ...wrapKey(masterKey, password) }],
    recovery: wrapKey(masterKey, recoveryKey),
  });
  return { masterKey, recoveryKey };
}

export function unlock(username: string, password: string): Buffer | null {
  let file: KeystoreFile;
  try {
    file = read();
  } catch {
    return null;
  }
  const entry = file.users.find((u) => u.username === username);
  return entry ? unwrapKey(entry, password) : null;
}

export function unlockWithRecovery(recoveryKey: string): Buffer | null {
  try {
    return unwrapKey(read().recovery, recoveryKey);
  } catch {
    return null;
  }
}

/** Wrap the (already-unlocked) master key for a new/updated account password. */
export function putUser(masterKey: Buffer, username: string, password: string): void {
  const file = read();
  file.users = file.users.filter((u) => u.username !== username);
  file.users.push({ username, ...wrapKey(masterKey, password) });
  write(file);
}

export function removeUser(username: string): void {
  const file = read();
  file.users = file.users.filter((u) => u.username !== username);
  write(file);
}
