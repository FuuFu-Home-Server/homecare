"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Real value of the trailing dynamic route segment.
 *
 * The desktop static export prerenders every dynamic route once under a `_`
 * placeholder (generateStaticParams), so the served template's flight tree
 * carries `key:"_"` and `useParams()` returns "_" — never the concrete id.
 * The live address bar holds the real id, so we read it from `window.location`.
 *
 * Resolution is seeded lazily on the first *client* render (window is defined),
 * so the id is correct from the very first paint — no flash of the placeholder.
 * On the server (prerender) there is no window, so we return "" — an explicit
 * "unresolved" signal callers render as loading, never as "not found". Reading
 * the placeholder `_` as an id is what made detail pages briefly show
 * "… tidak ditemukan" before hydration. usePathname() is referenced only to
 * re-resolve on client navigation.
 */
function currentSegment(): string {
  if (typeof window === "undefined") return "";
  const segments = window.location.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return last === "_" ? "" : last;
}

export function useDynamicSegment(): string {
  const pathname = usePathname();
  const [segment, setSegment] = useState(currentSegment);
  useEffect(() => {
    setSegment(currentSegment());
  }, [pathname]);
  return segment;
}
