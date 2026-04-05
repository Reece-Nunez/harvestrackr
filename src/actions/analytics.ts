"use server";

import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

// Re-export types from date-utils for convenience
export type { DateRangePreset, DateRange } from "@/lib/date-utils";

export interface AnalyticsSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalInvoices: number;
  totalInvoiceAmount: number;
  revenueChange: number;
  expenseChange: number;
  profitChange: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ItemData {
  item: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface TopExpense {
  id: string;
  date: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  category: string;
}

// Import DateRange for use in function signatures
import { type DateRange } from "@/lib/date-utils";

export async function getAnalyticsSummary(farmId: string, dateRange: DateRange): Promise<AnalyticsSummary> {
  const supabase = await createClient();
  const { startDate, endDate } = dateRange;

  // Calculate previous period for comparison
  // Add 1 day to period length so "Apr 1 - Apr 30" (30 days) produces "Mar 2 - Mar 31" correctly
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const periodLengthMs = endDateObj.getTime() - startDateObj.getTime() + 86400000; // +1 day in ms
  const prevStartDate = new Date(startDateObj.getTime() - periodLengthMs);
  const prevEndDate = new Date(startDateObj.getTime() - 86400000); // day before current start

  // Current period income
  const { data: currentIncome } = await supabase
    .from("income")
    .select("amount")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Previous period income
  const { data: prevIncome } = await supabase
    .from("income")
    .select("amount")
    .eq("farm_id", farmId)
    .gte("date", format(prevStartDate, "yyyy-MM-dd"))
    .lte("date", format(prevEndDate, "yyyy-MM-dd"));

  // Current period expenses
  const { data: currentExpenses } = await supabase
    .from("expenses")
    .select("grand_total")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Previous period expenses
  const { data: prevExpenses } = await supabase
    .from("expenses")
    .select("grand_total")
    .eq("farm_id", farmId)
    .gte("date", format(prevStartDate, "yyyy-MM-dd"))
    .lte("date", format(prevEndDate, "yyyy-MM-dd"));

  // Invoices
  const { data: invoices, count: invoiceCount } = await supabase
    .from("invoices")
    .select("total", { count: "exact" })
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  const totalRevenue = currentIncome?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
  const totalExpenses = currentExpenses?.reduce((sum, e) => sum + (e.grand_total || 0), 0) || 0;
  const netProfit = totalRevenue - totalExpenses;

  const prevTotalRevenue = prevIncome?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
  const prevTotalExpenses = prevExpenses?.reduce((sum, e) => sum + (e.grand_total || 0), 0) || 0;
  const prevNetProfit = prevTotalRevenue - prevTotalExpenses;

  const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
  const expenseChange = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0;
  const profitChange = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;

  const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalInvoices: invoiceCount || 0,
    totalInvoiceAmount,
    revenueChange,
    expenseChange,
    profitChange,
  };
}

export async function getExpensesByCategory(farmId: string, dateRange: DateRange): Promise<CategoryData[]> {
  const supabase = await createClient();
  const { startDate, endDate } = dateRange;

  // Get expenses with line items
  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      id,
      grand_total,
      expense_line_items (
        category,
        line_total
      )
    `)
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Aggregate by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  let totalAmount = 0;

  expenses?.forEach((expense) => {
    if (expense.expense_line_items && expense.expense_line_items.length > 0) {
      expense.expense_line_items.forEach((item: { category: string | null; line_total: number }) => {
        const cat = item.category || "Uncategorized";
        const current = categoryMap.get(cat) || { amount: 0, count: 0 };
        current.amount += item.line_total || 0;
        current.count += 1;
        categoryMap.set(cat, current);
        totalAmount += item.line_total || 0;
      });
    } else {
      // If no line items, count as "Uncategorized"
      const current = categoryMap.get("Uncategorized") || { amount: 0, count: 0 };
      current.amount += expense.grand_total || 0;
      current.count += 1;
      categoryMap.set("Uncategorized", current);
      totalAmount += expense.grand_total || 0;
    }
  });

  const categories: CategoryData[] = [];
  categoryMap.forEach((value, key) => {
    categories.push({
      category: key,
      amount: value.amount,
      percentage: totalAmount > 0 ? (value.amount / totalAmount) * 100 : 0,
      count: value.count,
    });
  });

  // Sort by amount descending
  return categories.sort((a, b) => b.amount - a.amount);
}

export async function getIncomeByItem(farmId: string, dateRange: DateRange): Promise<ItemData[]> {
  const supabase = await createClient();
  const { startDate, endDate } = dateRange;

  const { data: incomeData } = await supabase
    .from("income")
    .select("item, amount")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Aggregate by item
  const itemMap = new Map<string, { amount: number; count: number }>();
  let totalAmount = 0;

  incomeData?.forEach((income) => {
    const current = itemMap.get(income.item) || { amount: 0, count: 0 };
    current.amount += income.amount || 0;
    current.count += 1;
    itemMap.set(income.item, current);
    totalAmount += income.amount || 0;
  });

  const items: ItemData[] = [];
  itemMap.forEach((value, key) => {
    items.push({
      item: key,
      amount: value.amount,
      percentage: totalAmount > 0 ? (value.amount / totalAmount) * 100 : 0,
      count: value.count,
    });
  });

  // Sort by amount descending
  return items.sort((a, b) => b.amount - a.amount);
}

export async function getMonthlyTrends(farmId: string, year: number): Promise<MonthlyTrend[]> {
  const supabase = await createClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Get all income for the year
  const { data: incomeData } = await supabase
    .from("income")
    .select("date, amount")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Get all expenses for the year
  const { data: expenseData } = await supabase
    .from("expenses")
    .select("date, grand_total")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Create monthly buckets
  const months: MonthlyTrend[] = [];
  for (let month = 0; month < 12; month++) {
    const monthKey = format(new Date(year, month, 1), "MMM");
    const monthPrefix = format(new Date(year, month, 1), "yyyy-MM");

    const monthRevenue = incomeData
      ?.filter((i) => i.date.startsWith(monthPrefix))
      .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

    const monthExpenses = expenseData
      ?.filter((e) => e.date.startsWith(monthPrefix))
      .reduce((sum, e) => sum + (e.grand_total || 0), 0) || 0;

    months.push({
      month: monthKey,
      revenue: monthRevenue,
      expenses: monthExpenses,
      profit: monthRevenue - monthExpenses,
    });
  }

  return months;
}

export async function getCashFlowData(farmId: string, dateRange: DateRange): Promise<CashFlowData[]> {
  const supabase = await createClient();
  const { startDate, endDate } = dateRange;

  // Get all income
  const { data: incomeData } = await supabase
    .from("income")
    .select("date, amount")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  // Get all expenses
  const { data: expenseData } = await supabase
    .from("expenses")
    .select("date, grand_total")
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  // Combine and group by date
  const dateMap = new Map<string, { inflow: number; outflow: number }>();

  incomeData?.forEach((income) => {
    const current = dateMap.get(income.date) || { inflow: 0, outflow: 0 };
    current.inflow += income.amount || 0;
    dateMap.set(income.date, current);
  });

  expenseData?.forEach((expense) => {
    const current = dateMap.get(expense.date) || { inflow: 0, outflow: 0 };
    current.outflow += expense.grand_total || 0;
    dateMap.set(expense.date, current);
  });

  // Convert to array and calculate running balance
  const dates = Array.from(dateMap.keys()).sort();
  let runningBalance = 0;

  const cashFlowData: CashFlowData[] = dates.map((date) => {
    const { inflow, outflow } = dateMap.get(date)!;
    runningBalance += inflow - outflow;
    return {
      date: format(new Date(date), "MMM dd"),
      inflow,
      outflow,
      balance: runningBalance,
    };
  });

  return cashFlowData;
}

export async function getTopExpenses(farmId: string, dateRange: DateRange, limit: number = 10): Promise<TopExpense[]> {
  const supabase = await createClient();
  const { startDate, endDate } = dateRange;

  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      id,
      date,
      vendor,
      description,
      grand_total,
      expense_line_items (
        category
      )
    `)
    .eq("farm_id", farmId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("grand_total", { ascending: false })
    .limit(limit);

  return (
    expenses?.map((expense) => ({
      id: expense.id,
      date: expense.date,
      vendor: expense.vendor,
      description: expense.description,
      amount: expense.grand_total,
      category: expense.expense_line_items?.[0]?.category || "Uncategorized",
    })) || []
  );
}

export async function getRecentTransactions(farmId: string, limit: number = 10) {
  const supabase = await createClient();

  // Get recent expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, date, vendor, grand_total")
    .eq("farm_id", farmId)
    .order("date", { ascending: false })
    .limit(limit);

  // Get recent income
  const { data: income } = await supabase
    .from("income")
    .select("id, date, item, amount")
    .eq("farm_id", farmId)
    .order("date", { ascending: false })
    .limit(limit);

  // Combine and sort
  const transactions = [
    ...(expenses?.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.vendor || "Expense",
      amount: -e.grand_total,
      type: "expense" as const,
    })) || []),
    ...(income?.map((i) => ({
      id: i.id,
      date: i.date,
      description: i.item,
      amount: i.amount,
      type: "income" as const,
    })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return transactions.slice(0, limit);
}
