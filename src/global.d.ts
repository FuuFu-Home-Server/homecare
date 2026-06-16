import type { HomeDocBridge } from "@/types";

declare global {
  interface Window {
    homedoc?: HomeDocBridge;
  }
}

export {};
