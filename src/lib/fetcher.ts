/**
 * Thin typed transport wrappers. Throw on non-2xx with the server's message.
 *
 * On the desktop build the renderer reaches the repositories over the Electron
 * IPC bridge (window.homedoc); on the web build it falls back to HTTP fetch.
 * Hook call sites are identical across both — this is the only switch point.
 */
import type { ApiMethod, HomeDocBridge } from "@/types";

interface ApiError {
  error: string;
}

function isApiError(data: unknown): data is ApiError {
  return typeof data === "object" && data !== null && "error" in data && typeof data.error === "string";
}

function bridge(): HomeDocBridge | undefined {
  return typeof window !== "undefined" ? window.homedoc : undefined;
}

async function viaBridge<T>(
  b: HomeDocBridge,
  method: ApiMethod,
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const res = await b.invoke({ method, path, body });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(isApiError(res.data) ? res.data.error : fallback);
  }
  return res.data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const b = bridge();
  if (b) return viaBridge<T>(b, "GET", url, undefined, "Gagal memuat data.");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(isApiError(data) ? data.error : "Gagal memuat data.");
  return data as T;
}

async function sendJson<T>(method: "POST" | "PATCH", url: string, body: unknown): Promise<T> {
  const b = bridge();
  if (b) return viaBridge<T>(b, method, url, body, "Terjadi kesalahan.");
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(isApiError(data) ? data.error : "Terjadi kesalahan.");
  return data as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>("POST", url, body);
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return sendJson<T>("PATCH", url, body);
}

export async function deleteJson<T>(url: string): Promise<T> {
  const b = bridge();
  if (b) return viaBridge<T>(b, "DELETE", url, undefined, "Gagal menghapus.");
  const res = await fetch(url, { method: "DELETE" });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(isApiError(data) ? data.error : "Gagal menghapus.");
  return data as T;
}
