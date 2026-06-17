"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { navForRole } from "@/components/layout/nav";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";
import { IconSettings } from "@/components/layout/icons";

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const clinic = useClinic();
  const items = navForRole(user.role);
  const settingsActive = pathname === "/pengaturan" || pathname.startsWith("/pengaturan/");

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <span className="text-lg font-bold leading-none">+</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{clinic.appTitle || "HomeCare"}</p>
          <p className="truncate text-xs text-slate-400">{clinic.kota}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-100 px-3 py-3">
        <Link
          href="/pengaturan"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            settingsActive
              ? "bg-brand-50 text-brand-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          <IconSettings className={cn("h-5 w-5", settingsActive ? "text-brand-600" : "text-slate-400")} />
          Pengaturan
        </Link>
        <p className="px-3 pt-1 text-xs text-slate-400">SIPP {clinic.sipp}</p>
      </div>
    </aside>
  );
}
