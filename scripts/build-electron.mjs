import { build, context } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watch = process.argv.includes("--watch");

/**
 * Node deps stay external (resolved from node_modules at runtime); our own
 * sources bundle. The route table is a separate output chunk so it — and the
 * better-sqlite3 binding it pulls in — loads lazily on the first IPC call.
 */
const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  packages: "external",
  tsconfig: path.join(root, "electron", "tsconfig.json"),
  outdir: path.join(root, "dist-electron"),
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production") },
};

const entryPoints = [
  path.join(root, "electron", "main.ts"),
  path.join(root, "electron", "preload.ts"),
  path.join(root, "electron", "route-table.generated.ts"),
];

if (watch) {
  const ctx = await context({ ...shared, entryPoints });
  await ctx.watch();
  console.log("[build-electron] watching…");
} else {
  await build({ ...shared, entryPoints });
}
