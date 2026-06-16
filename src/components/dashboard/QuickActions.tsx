import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { IconPasien, IconAntrian, IconKasir } from "@/components/layout/icons";
import type { ComponentType, SVGProps } from "react";

interface Action {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const ACTIONS: ReadonlyArray<Action> = [
  { href: "/pasien?baru=1", label: "Pasien Baru", icon: IconPasien },
  { href: "/antrian?baru=1", label: "Booking Baru", icon: IconAntrian },
  { href: "/kasir", label: "Buka Kasir", icon: IconKasir },
];

export function QuickActions() {
  return (
    <Card className="p-3">
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-2 rounded-lg px-2 py-4 text-center transition-colors hover:bg-brand-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium text-slate-700">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
