import type { HomeCareBridge } from "@/types";

declare global {
  interface Window {
    homecare?: HomeCareBridge;
  }
}

export {};
