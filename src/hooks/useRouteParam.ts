"use client";

import { usePathname } from "next/navigation";

/**
 * Real value of the trailing dynamic route segment.
 *
 * The desktop static export prerenders every dynamic route once under a `_`
 * placeholder (generateStaticParams), so the served template's flight tree
 * carries `key:"_"` and `useParams()` returns "_" — never the concrete id.
 * The live address bar still holds the real id, so we read it from there.
 * usePathname() is referenced only to re-run on client navigation; the value
 * comes from window.location to stay correct even when the router context still
 * carries the placeholder.
 */
export function useDynamicSegment(): string {
  const pathname = usePathname();
  const source = typeof window === "undefined" ? pathname : window.location.pathname;
  const segments = source.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}
