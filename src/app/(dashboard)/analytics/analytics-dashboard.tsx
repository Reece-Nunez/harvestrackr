"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/utils";
import { ExpenseCategoryChart } from "@/components/charts/expense-category-chart";
import { IncomeItemChart } from "@/components/charts/income-item-chart";
import { RevenueExpenseChart } from "@/components/charts/revenue-expense-chart";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import {
  getAnalyticsSummary,
  getExpensesByCategory,
  getIncomeByItem,
  getMonthlyTrends,
  getCashFlowData,
  getTopExpenses,
  getRecentTransactions,
  type AnalyticsSummary,
  type CategoryData,
  type ItemData,
  type MonthlyTrend,
  type CashFlowData,
  type TopExpense,
} from "@/actions/analytics";
import { getDateRangeFromPreset, type DateRangePreset } from "@/lib/date-utils";

interface AnalyticsDashboardProps {
  farmId: string;
}

export function AnalyticsDashboard({ farmId }: AnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>(
    (searchParams.get("preset") as DateRangePreset) || "this_month"
  );
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  // Data state
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryData[]>([]);
  const [incomeByItem, setIncomeByItem] = useState<ItemData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopExpense[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    { id: string; date: string; description: string; amount: number; type: "expense" | "income" }[]
  >([]);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRangeFromPreset(
        datePreset,
        customStartDate ? format(customStartDate, "yyyy-MM-dd") : undefined,
        customEndDate ? format(customEndDate, "yyyy-MM-dd") : undefined
      );

      const currentYear = new Date().getFullYear();

      const [
        summaryData,
        categoryData,
        itemData,
        trendsData,
        flowData,
        topExpensesData,
        transactionsData,
      ] = await Promise.all([
        getAnalyticsSummary(farmId, dateRange),
        getExpensesByCategory(farmId, dateRange),
        getIncomeByItem(farmId, dateRange),
        getMonthlyTrends(farmId, currentYear),
        getCashFlowData(farmId, dateRange),
        getTopExpenses(farmId, dateRange, 5),
        getRecentTransactions(farmId, 10),
      ]);

      setSummary(summaryData);
      setExpensesByCategory(categoryData);
      setIncomeByItem(itemData);
      setMonthlyTrends(trendsData);
      setCashFlowData(flowData);
      setTopExpenses(topExpensesData);
      setRecentTransactions(transactionsData);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [farmId, datePreset, customStartDate, customEndDate]);

  const handleRefresh = () => {
    startTransition(() => {
      loadData();
    });
  };

  const handlePresetChange = (value: DateRangePreset) => {
    setDatePreset(value);
    if (value !== "custom") {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <DatePicker
                date={customStartDate}
                onDateChange={setCustomStartDate}
                placeholder="Start date"
              />
              <span className="text-muted-foreground">to</span>
              <DatePicker
                date={customEndDate}
                onDateChange={setCustomEndDate}
                placeholder="End date"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports">
              <Download className="h-4 w-4 mr-2" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={summary?.totalRevenue ?? 0}
          change={summary?.revenueChange ?? 0}
          icon={DollarSign}
          loading={loading}
          variant="success"
        />
        <KPICard
          title="Total Expenses"
          value={summary?.totalExpenses ?? 0}
          change={summary?.expenseChange ?? 0}
          icon={Receipt}
          loading={loading}
          variant="danger"
          invertTrend
        />
        <KPICard
          title="Net Profit"
          value={summary?.netProfit ?? 0}
          change={summary?.profitChange ?? 0}
          icon={TrendingUp}
          loading={loading}
          variant={(summary?.netProfit ?? 0) >= 0 ? "success" : "danger"}
        />
        <KPICard
          title="Invoices"
          value={summary?.totalInvoiceAmount ?? 0}
          count={summary?.totalInvoices ?? 0}
          icon={FileText}
          loading={loading}
          variant="info"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseCategoryChart data={expensesByCategory} loading={loading} />
        <IncomeItemChart data={incomeByItem} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueExpenseChart data={monthlyTrends} loading={loading} />
        <CashFlowChart data={cashFlowData} loading={loading} />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Top Expenses</CardTitle>
                <CardDescription>Highest expenses this period</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/expenses">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses recorded this period
              </div>
            ) : (
              <div className="space-y-3">
                {topExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {expense.vendor || expense.description || "Expense"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{format(new Date(expense.date), "MMM dd")}</span>
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                      </div>
                    </div>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(expense.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Recent Transactions</CardTitle>
                <CardDescription>Latest income and expenses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <Link
                    key={`${transaction.type}-${transaction.id}`}
                    href={`/${transaction.type === "income" ? "income" : "expenses"}/${transaction.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium truncate max-w-[150px]">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.amount >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  variant?: "success" | "danger" | "info" | "warning";
  invertTrend?: boolean;
}

function KPICard({
  title,
  value,
  change,
  count,
  icon: Icon,
  loading,
  variant = "info",
  invertTrend = false,
}: KPICardProps) {
  const variantStyles = {
    success: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    danger: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    info: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
  };

  const getTrendColor = (changeValue: number) => {
    if (changeValue === 0) return "text-muted-foreground";
    const isPositive = invertTrend ? changeValue < 0 : changeValue > 0;
    return isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getTrendIcon = (changeValue: number) => {
    if (changeValue === 0) return null;
    const isPositive = invertTrend ? changeValue < 0 : changeValue > 0;
    return isPositive ? TrendingUp : TrendingDown;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = change !== undefined ? getTrendIcon(change) : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-full ${variantStyles[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{formatCurrency(value)}</p>
          <div className="flex items-center gap-2 mt-1">
            {change !== undefined && (
              <span className={`text-sm flex items-center ${getTrendColor(change)}`}>
                {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            )}
            {count !== undefined && (
              <span className="text-sm text-muted-foreground">
                {count} invoice{count !== 1 ? "s" : ""}
              </span>
            )}
            {change !== undefined && (
              <span className="text-xs text-muted-foreground">vs last period</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
