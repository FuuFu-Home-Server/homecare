import { app, screen, type BrowserWindow, type Rectangle } from "electron";
import fs from "node:fs";
import path from "node:path";

const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

export interface WindowState {
  bounds: Rectangle;
  maximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  bounds: { x: 0, y: 0, width: 1280, height: 800 },
  maximized: false,
};

function isVisibleOnSomeDisplay(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    return (
      bounds.x < area.x + area.width &&
      bounds.x + bounds.width > area.x &&
      bounds.y < area.y + area.height &&
      bounds.y + bounds.height > area.y
    );
  });
}

export function loadWindowState(): WindowState {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as Partial<WindowState>;
    if (raw.bounds && isVisibleOnSomeDisplay(raw.bounds)) {
      return { bounds: raw.bounds, maximized: raw.maximized ?? false };
    }
  } catch {
    /* first run or corrupt file — fall back to defaults */
  }
  return DEFAULT_STATE;
}

export function persistWindowState(window: BrowserWindow): void {
  const maximized = window.isMaximized();
  const bounds = maximized ? loadWindowState().bounds : window.getBounds();
  const state: WindowState = { bounds, maximized };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), "utf-8");
  } catch {
    /* non-fatal: window position is a convenience, not data */
  }
}
