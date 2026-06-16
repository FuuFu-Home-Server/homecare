import type { NextConfig } from "next";

/**
 * BUILD_TARGET=desktop produces a fully static export (out/) for the Electron
 * renderer — no server, no port. The app/api route handlers are sidelined for
 * that build (export forbids dynamic handlers); they remain for a future web
 * build. See scripts/build-desktop.mjs.
 */
const desktop = process.env.BUILD_TARGET === "desktop";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  ...(desktop
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
