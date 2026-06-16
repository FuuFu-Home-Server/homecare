/** Thin typed fetch wrappers. Throw on non-2xx with the server's error message. */

interface ApiError {
  error: string;
}

function isApiError(data: unknown): data is ApiError {
  return typeof data === "object" && data !== null && "error" in data && typeof data.error === "string";
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(isApiError(data) ? data.error : "Gagal memuat data.");
  return data as T;
}

async function sendJson<T>(method: "POST" | "PATCH", url: string, body: unknown): Promise<T> {
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
  const res = await fetch(url, { method: "DELETE" });
  const data: unknown = await res.json();
  if (!res.ok) throw new Error(isApiError(data) ? data.error : "Gagal menghapus.");
  return data as T;
}
