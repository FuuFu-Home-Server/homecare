import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

export interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  tone?: "brand" | "emerald" | "amber" | "sky";
  href?: string;
}

const TONE_BG: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
};

export function StatCard({ label, value, sublabel, icon, tone = "brand", href }: StatCardProps) {
  const inner = (
    <Card
      className={cn(
        "flex h-full flex-col p-5 transition-shadow",
        href ? "hover:shadow-md" : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon ? (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONE_BG[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular text-slate-900">{value}</p>
      <p className="mt-auto pt-1 text-xs text-slate-400">{sublabel ?? " "}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
