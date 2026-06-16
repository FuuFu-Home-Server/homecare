import { NextResponse } from "next/server";
import {
  getClinicalReport,
  getExpenses,
  getFinancialReport,
  getInventoryReport,
  getTransactions,
} from "@/lib/db/reports";
import { currentUser } from "@/lib/session";
import { monthWIB } from "@/lib/format";

export async function GET(request: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const url = new URL(request.url);
  const raw = url.searchParams.get("month");
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : monthWIB();

  return NextResponse.json({
    month,
    financial: getFinancialReport(month),
    clinical: getClinicalReport(month),
    inventory: getInventoryReport(),
    transactions: getTransactions(month),
    expenses: getExpenses(month),
  });
}
