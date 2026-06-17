import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Minimal zero-dependency file logger for the main process. Offline desktop app
 * has no telemetry sink, so durable on-disk logs are the only post-mortem trail.
 * One active file with a single rotation when it grows past the cap.
 */

const MAX_BYTES = 1_000_000;
let logFile: string | null = null;

function file(): string {
  if (!logFile) {
    const dir = path.join(app.getPath("userData"), "logs");
    fs.mkdirSync(dir, { recursive: true });
    logFile = path.join(dir, "main.log");
  }
  return logFile;
}

function rotate(f: string): void {
  try {
    if (fs.existsSync(f) && fs.statSync(f).size > MAX_BYTES) {
      fs.rmSync(`${f}.1`, { force: true });
      fs.renameSync(f, `${f}.1`);
    }
  } catch {
    /* logging must never throw */
  }
}

function serialize(d: unknown): string {
  if (d instanceof Error) return d.stack ?? d.message;
  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}

export type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, detail?: unknown): void {
  const line = `${new Date().toISOString()} [${level}] ${message}${
    detail !== undefined ? ` ${serialize(detail)}` : ""
  }\n`;
  try {
    const f = file();
    rotate(f);
    fs.appendFileSync(f, line);
  } catch {
    /* logging must never throw */
  }
  if (level === "error") console.error(line.trim());
}

export function logPath(): string {
  return file();
}
