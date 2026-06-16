"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { rupiah, tglPendek, tglWIB } from "@/lib/format";
import type { TrendPoint } from "@/types";

interface ChartRow {
  label: string;
  full: string;
  value: number;
}

function toRows(data: TrendPoint[]): ChartRow[] {
  return data.map((p) => ({ label: tglPendek(p.tanggal), full: tglWIB(p.tanggal), value: p.value }));
}

export interface RevenueChartProps {
  data: TrendPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const rows = toRows(data);
  return (
    <Card>
      <CardHeader title="Tren Pendapatan" subtitle="14 hari terakhir" />
      <div className="h-64 px-2 pb-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              formatter={(v) => [rupiah(typeof v === "number" ? v : Number(v)), "Pendapatan"]}
              labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export interface VisitChartProps {
  data: TrendPoint[];
}

export function VisitChart({ data }: VisitChartProps) {
  const rows = toRows(data);
  return (
    <Card>
      <CardHeader title="Volume Kunjungan" subtitle="14 hari terakhir" />
      <div className="h-64 px-2 pb-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(v) => [`${v} kunjungan`, ""]}
              labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
              contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              cursor={{ fill: "#f8fafc" }}
            />
            <Bar dataKey="value" fill="#5eead4" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
