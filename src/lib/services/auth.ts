import { checkPassword, findUserByUsername, findUserById } from "@/lib/db/users";
import type { User } from "@/types";

/**
 * Auth seam. The rest of the app depends on this interface, never on the hashing
 * library or the users table directly. Swapping the implementation (e.g. to add
 * a key-derivation step for DB encryption) never touches a call site.
 */
export interface AuthService {
  /** Verify credentials. Returns the user on success, null on failure. */
  login(username: string, password: string): Promise<User | null>;
  /** Look up a user by id (used to rehydrate the session). */
  getUser(id: number): Promise<User | null>;
}

/** Local, on-device accounts with Argon2id password verification. */
class LocalAuth implements AuthService {
  async login(username: string, password: string): Promise<User | null> {
    const found = findUserByUsername(username);
    if (!found || !found.aktif) return null;
    if (!checkPassword(found.passwordHash, password)) return null;
    const { passwordHash: _omit, ...user } = found;
    return user;
  }

  async getUser(id: number): Promise<User | null> {
    return findUserById(id);
  }
}

export const authService: AuthService = new LocalAuth();
