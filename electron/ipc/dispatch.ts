import { ipcMain } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCurrentSession, runWithUser } from "@/lib/request-context";
import { policyFor } from "../rbac";
import type { ApiRequest, ApiResponse } from "@/types";
import type { HttpMethod, RouteEntry } from "../route-types";

interface Matched {
  entry: RouteEntry;
  params: Record<string, string>;
}

/**
 * Lazy so requiring the dispatcher does not pull the route modules — and through
 * them better-sqlite3 — into the main process until the first IPC call. In dev
 * the renderer still talks HTTP, so this stays unloaded and avoids a native-ABI
 * clash with the next-dev process.
 */
interface RouteChunk {
  ROUTES: RouteEntry[];
  closeDb: () => void;
  autoBackupIfDue: () => unknown;
}

let chunkPromise: Promise<RouteChunk> | null = null;
function loadChunk(): Promise<RouteChunk> {
  if (!chunkPromise) {
    // Computed specifier + sibling chunk: esbuild leaves this as a true runtime
    // import, so the route modules (and better-sqlite3) load only on first call.
    const file = pathToFileURL(path.join(__dirname, "route-table.generated.js")).href;
    chunkPromise = import(file);
  }
  return chunkPromise;
}

function findEntry(routes: RouteEntry[], pathname: string): Matched | null {
  for (const entry of routes) {
    const m = entry.regex.exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    entry.paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(m[i + 1] ?? "");
    });
    return { entry, params };
  }
  return null;
}

function reply(status: number, error: string): ApiResponse {
  return { status, data: { error } };
}

async function dispatch(req: ApiRequest): Promise<ApiResponse> {
  const pathname = req.path.split("?")[0] ?? req.path;
  const { ROUTES } = await loadChunk();
  const found = findEntry(ROUTES, pathname);
  if (!found) return reply(404, "Rute tidak ditemukan.");

  const handler = found.entry.handlers[req.method as HttpMethod];
  if (!handler) return reply(405, "Metode tidak diizinkan.");

  const policy = policyFor(req.method as HttpMethod, found.entry.routePath);
  const user = getCurrentSession();
  const role = user?.role;
  if (!policy.public) {
    if (!role) return reply(401, "Tidak terautentikasi.");
    if (!policy.roles.includes(role)) return reply(403, "Akses ditolak.");
  }

  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.body !== undefined) {
    init.body = JSON.stringify(req.body);
    init.headers = { "Content-Type": "application/json" };
  }
  const request = new Request(`http://desktop${req.path}`, init);
  const ctx = { params: Promise.resolve(found.params) };

  try {
    const res = await runWithUser(user, () => handler(request, ctx));
    const data: unknown = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch (e) {
    return reply(500, e instanceof Error ? e.message : "Kesalahan server.");
  }
}

export function registerIpc(): void {
  ipcMain.handle("api:invoke", (_event, req: ApiRequest): Promise<ApiResponse> => dispatch(req));
}

/** Flush and close the DB on quit — but only if a route actually opened it. */
export async function shutdown(): Promise<void> {
  if (!chunkPromise) return;
  const { closeDb } = await chunkPromise;
  closeDb();
}

/** Daily on-device backup if due. Loads the DB chunk on demand; never throws. */
export async function autoBackup(): Promise<void> {
  try {
    const { autoBackupIfDue } = await loadChunk();
    autoBackupIfDue();
  } catch {
    /* non-fatal: backup is best-effort */
  }
}
