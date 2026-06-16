import { protocol } from "electron";
import fs from "node:fs";
import path from "node:path";

export const APP_SCHEME = "app";
export const APP_ORIGIN = `${APP_SCHEME}://bundle/`;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

/** Must run before app `ready`. */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true },
    },
  ]);
}

/**
 * Resolve a request pathname to a file inside the static export. Pages live at
 * `<route>/index.html` (trailingSlash). Dynamic routes are exported once under a
 * `_` placeholder template (e.g. /pasien/_/index.html); a concrete id like
 * /pasien/123 has no file, so we fall back to replacing the last path segment
 * with `_`. The client then reads the real id via useParams.
 */
/** True only if `candidate` resolves to a path inside `base` (defends against ../). */
function isContained(base: string, candidate: string): boolean {
  const resolved = path.resolve(candidate);
  return resolved === base || resolved.startsWith(base + path.sep);
}

function resolveFile(outDir: string, pathname: string): string {
  const base = path.resolve(outDir);
  const notFound = path.join(base, "404.html");

  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (clean === "") return path.join(base, "index.html");

  // Reject traversal / NUL / Windows separators outright.
  if (clean.includes("\0") || clean.includes("\\")) return notFound;
  if (clean.split("/").some((seg) => seg === "..")) return notFound;

  const candidate =
    path.extname(clean) !== "" ? path.join(base, clean) : path.join(base, clean, "index.html");
  if (isContained(base, candidate) && fs.existsSync(candidate)) return candidate;

  if (path.extname(clean) === "") {
    const parts = clean.split("/");
    parts[parts.length - 1] = "_";
    const template = path.join(base, parts.join("/"), "index.html");
    if (isContained(base, template) && fs.existsSync(template)) return template;
  }

  return notFound;
}

export function registerStaticProtocol(outDir: string): void {
  const base = path.resolve(outDir);
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    const file = resolveFile(base, decodeURIComponent(pathname));
    if (!isContained(base, file)) {
      return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain" } });
    }
    try {
      const data = await fs.promises.readFile(file);
      const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      return new Response(new Uint8Array(data), { headers: { "Content-Type": type } });
    } catch {
      return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
  });
}
