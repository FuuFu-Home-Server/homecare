import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "src", "app", "api");
const sidelined = path.join(root, ".api-sidelined");

/**
 * Static export for the Electron renderer. `output: export` rejects dynamic API
 * route handlers, so the app/api tree is moved aside for the build and restored
 * afterwards (kept in-tree for a possible future web build). Always restored,
 * even on failure.
 */
function restore() {
  if (fs.existsSync(sidelined)) {
    fs.rmSync(apiDir, { recursive: true, force: true });
    fs.renameSync(sidelined, apiDir);
  }
}

try {
  fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
  fs.rmSync(path.join(root, "out"), { recursive: true, force: true });
  if (fs.existsSync(apiDir)) fs.renameSync(apiDir, sidelined);
  execSync("next build", {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, BUILD_TARGET: "desktop" },
  });
} finally {
  restore();
}
