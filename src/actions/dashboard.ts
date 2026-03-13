"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeChange: number;
  expenseChange: number;
  profitChange: number;
  pendingInvoiceCount: number;
  pendingInvoiceAmount: number;
}

export interface RecentExpense {
  id: string;
  date: string;
  vendor: string | null;
  grand_total: number;
}

export interface RecentIncome {
  id: string;
  date: string;
  item: string;
  amount: number;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardStats(farmId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const now = new Date();

  const thisMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const thisMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = format(startOfMonth(lastMonth), "yyyy-MM-dd");
  const lastMonthEnd = format(endOfMonth(lastMonth), "yyyy-MM-dd");

  // Current month income
  const { data: currentIncome } = await supabase
    .from("income")
    .select("amount")
    .eq("farm_id", farmId)
    .gte("date", thisMonthStart)
    .lte("date", thisMonthEnd);

  // Previous month income
  const { data: prevIncome } = await supabase
    .from("income")
    .select("amount")
    .eq("farm_id", farmId)
    .gte("date", lastMonthStart)
    .lte("date", lastMonthEnd);

  // Current month expenses
  const { data: currentExpenses } = await supabase
    .from("expenses")
    .select("grand_total")
    .eq("farm_id", farmId)
    .gte("date", thisMonthStart)
    .lte("date", thisMonthEnd);

  // Previous month expenses
  const { data: prevExpenses } = await supabase
    .from("expenses")
    .select("grand_total")
    .eq("farm_id", farmId)
    .gte("date", lastMonthStart)
    .lte("date", lastMonthEnd);

  // Pending invoices
  const { data: pendingInvoices } = await supabase
    .from("invoices")
    .select("total, status")
    .eq("farm_id", farmId)
    .in("status", ["SENT", "OVERDUE"]);

  const totalIncome = (currentIncome || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = (currentExpenses || []).reduce((sum, r) => sum + (r.grand_total || 0), 0);
  const prevTotalIncome = (prevIncome || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const prevTotalExpenses = (prevExpenses || []).reduce((sum, r) => sum + (r.grand_total || 0), 0);

  const netProfit = totalIncome - totalExpenses;
  const prevNetProfit = prevTotalIncome - prevTotalExpenses;

  const pendingInvoiceCount = (pendingInvoices || []).length;
  const pendingInvoiceAmount = (pendingInvoices || []).reduce((sum, inv) => sum + (inv.total || 0), 0);

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    incomeChange: percentChange(totalIncome, prevTotalIncome),
    expenseChange: percentChange(totalExpenses, prevTotalExpenses),
    profitChange: percentChange(netProfit, prevNetProfit),
    pendingInvoiceCount,
    pendingInvoiceAmount,
  };
}

export async function getRecentExpenses(farmId: string): Promise<RecentExpense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("id, date, vendor, grand_total")
    .eq("farm_id", farmId)
    .order("date", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching recent expenses:", error);
    return [];
  }

  return data || [];
}

export async function getRecentIncome(farmId: string): Promise<RecentIncome[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("income")
    .select("id, date, item, amount")
    .eq("farm_id", farmId)
    .order("date", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching recent income:", error);
    return [];
  }

  return data || [];
}
