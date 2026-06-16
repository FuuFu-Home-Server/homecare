import { build, context } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

/** Native + Electron stay external; everything else bundles into CJS for the main process. */
const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  external: ["electron", "better-sqlite3", "argon2", "better-sqlite3-multiple-ciphers"],
  outdir: path.join(root, "dist-electron"),
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production") },
};

const entryPoints = [
  path.join(root, "electron", "main.ts"),
  path.join(root, "electron", "preload.ts"),
];

if (watch) {
  const ctx = await context({ ...shared, entryPoints });
  await ctx.watch();
  console.log("[build-electron] watching…");
} else {
  await build({ ...shared, entryPoints });
}
