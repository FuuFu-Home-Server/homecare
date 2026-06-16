import bcrypt from "bcryptjs";
import { findUserByRole, findUserByUsername, findUserById } from "@/lib/db/users";
import type { Role, User } from "@/types";

/**
 * Auth seam. The rest of the app depends on this interface, never on bcrypt or
 * the users table directly. Production swaps `DemoAuth` for an SSO/OIDC-backed
 * implementation without touching any call site.
 */
export interface AuthService {
  /** Verify credentials. Returns the user on success, null on failure. */
  login(username: string, password: string): Promise<User | null>;
  /** Look up a user by id (used to rehydrate the session). */
  getUser(id: number): Promise<User | null>;
  /**
   * DEMO STUB: instant role switch for the demo. Picks the seeded user for a
   * role with no password. Production would never expose this — auth would be
   * per real identity. Marked clearly so it is easy to remove.
   */
  switchToRole(role: Role): Promise<User | null>;
}

// DEMO STUB implementation — credentials live in the seeded `users` table.
class DemoAuth implements AuthService {
  async login(username: string, password: string): Promise<User | null> {
    const found = findUserByUsername(username);
    if (!found || !found.aktif) return null;
    const ok = bcrypt.compareSync(password, found.passwordHash);
    if (!ok) return null;
    const { passwordHash: _omit, ...user } = found;
    return user;
  }

  async getUser(id: number): Promise<User | null> {
    return findUserById(id);
  }

  async switchToRole(role: Role): Promise<User | null> {
    return findUserByRole(role);
  }
}

export const authService: AuthService = new DemoAuth();
