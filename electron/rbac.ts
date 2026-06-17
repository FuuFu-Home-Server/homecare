import type { Role } from "@/types";
import type { HttpMethod } from "./route-types";

export interface RoutePolicy {
  public: boolean;
  roles: ReadonlyArray<Role>;
}

const BOTH: ReadonlyArray<Role> = ["asisten", "perawat"];
const PERAWAT: ReadonlyArray<Role> = ["perawat"];

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/recover",
  "/api/setup",
  "/api/setup/status",
]);

/** Perawat-only: Rekam Medis, Penggajian, Manajemen Staf — by route template. */
// Note: /api/treatments is the tindakan price list read by Kasir (asisten), so
// it is intentionally NOT perawat-only.
const PERAWAT_PREFIXES = ["/api/records", "/api/payroll", "/api/users", "/api/backup", "/api/admin"];
// Perawat-only for ALL methods (these are clinical writes by nature).
const PERAWAT_TEMPLATES = [
  /^\/api\/visits\/\[id\]\/(soap|interventions)$/,
  /^\/api\/interventions\/\[id\]$/,
];
// Read/write split: asisten may READ the rekam-medis bundle
// (GET /api/visits/[id]/consult) but any mutating method stays perawat-only,
// so a future write handler on this path can't silently open to asisten.
const PERAWAT_WRITE_TEMPLATES = [/^\/api\/visits\/\[id\]\/consult$/];

/**
 * RBAC enforced at the IPC boundary, not just nav visibility. A crafted IPC call
 * from an asisten session to a perawat-only route is rejected here in main,
 * regardless of what the renderer renders. `routePath` is the stable file-based
 * template (e.g. "/api/visits/[id]/soap"), so concrete ids never bypass a rule.
 */
export function policyFor(method: HttpMethod, routePath: string): RoutePolicy {
  if (PUBLIC_PATHS.has(routePath)) return { public: true, roles: BOTH };

  const perawatOnly =
    PERAWAT_PREFIXES.some((p) => routePath === p || routePath.startsWith(`${p}/`)) ||
    PERAWAT_TEMPLATES.some((re) => re.test(routePath)) ||
    (method !== "GET" && PERAWAT_WRITE_TEMPLATES.some((re) => re.test(routePath)));

  return { public: false, roles: perawatOnly ? PERAWAT : BOTH };
}
