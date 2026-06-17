"use client";

import { cn } from "@/lib/cn";

const CHECKS: ((p: string) => boolean)[] = [
  (p) => p.length >= 8,
  (p) => /[a-z]/.test(p) && /[A-Z]/.test(p),
  (p) => /\d/.test(p),
  (p) => /[^A-Za-z0-9]/.test(p) || p.length >= 12,
];

const META = [
  { label: "Sangat lemah", bar: "bg-red-500", text: "text-red-600" },
  { label: "Lemah", bar: "bg-orange-500", text: "text-orange-600" },
  { label: "Cukup", bar: "bg-yellow-500", text: "text-yellow-600" },
  { label: "Kuat", bar: "bg-lime-500", text: "text-lime-600" },
  { label: "Sangat kuat", bar: "bg-emerald-500", text: "text-emerald-600" },
] as const;

function score(pw: string): number {
  return CHECKS.reduce((n, ok) => n + (ok(pw) ? 1 : 0), 0);
}

/** Four-segment strength bar for new-password fields. Hidden while empty. */
export function PasswordMeter({ value }: { value: string }) {
  if (!value) return null;
  const s = score(value);
  const meta = META[s] ?? META[0];
  const filled = Math.max(s, 1);
  return (
    <div className="mt-1.5">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full", i < filled ? meta.bar : "bg-slate-200")}
          />
        ))}
      </div>
      <p className={cn("mt-1 text-xs font-medium", meta.text)}>Kekuatan: {meta.label}</p>
    </div>
  );
}
