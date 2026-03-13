"use client";

import * as React from "react";
import { useFarm } from "@/components/providers/farm-provider";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ScanLine,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getDashboardStats,
  getRecentExpenses,
  getRecentIncome,
  type DashboardStats,
  type RecentExpense,
  type RecentIncome,
} from "@/actions/dashboard";

export default function DashboardPage() {
  const { currentFarm, user } = useFarm();
  const firstName = user?.first_name || "there";

  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentExpenses, setRecentExpenses] = React.useState<RecentExpense[]>([]);
  const [recentIncomeList, setRecentIncomeList] = React.useState<RecentIncome[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentFarm) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [statsData, expenses, income] = await Promise.all([
          getDashboardStats(currentFarm!.id),
          getRecentExpenses(currentFarm!.id),
          getRecentIncome(currentFarm!.id),
        ]);

        if (!cancelled) {
          setStats(statsData);
          setRecentExpenses(expenses);
          setRecentIncomeList(income);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [currentFarm]);

  function TrendBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
    const isPositive = inverted ? value <= 0 : value >= 0;
    const Icon = value >= 0 ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
        <Icon className="mr-1 h-3 w-3" />
        {value >= 0 ? "+" : ""}
        {value}%
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title={`Welcome back, ${firstName}!`}
        description={
          currentFarm
            ? `Here's what's happening at ${currentFarm.name}`
            : "Select a farm to get started"
        }
        showBreadcrumbs={false}
      />

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Link href="/scan-receipt">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className="rounded-full bg-purple-500/10 p-3 mb-2">
                <ScanLine className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-sm font-medium">Scan Receipt</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expenses/new">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className="rounded-full bg-orange-500/10 p-3 mb-2">
                <Receipt className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-sm font-medium">Add Expense</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/income/new">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className="rounded-full bg-blue-500/10 p-3 mb-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Add Income</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/analytics">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className="rounded-full bg-green-500/10 p-3 mb-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium">Analytics</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.totalIncome ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendBadge value={stats?.incomeChange ?? 0} /> from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.totalExpenses ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendBadge value={stats?.expenseChange ?? 0} inverted /> from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${(stats?.netProfit ?? 0) >= 0 ? "" : "text-red-500"}`}>
                  {formatCurrency(stats?.netProfit ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendBadge value={stats?.profitChange ?? 0} /> from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pendingInvoiceCount ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pendingInvoiceAmount ?? 0)} outstanding
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest expense entries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p>No expenses recorded yet</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/expenses/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first expense
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}/view`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{expense.vendor || "Unknown Vendor"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">
                      -{formatCurrency(expense.grand_total)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Income</CardTitle>
              <CardDescription>Your latest income entries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/income">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentIncomeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                <p>No income recorded yet</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/income/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first income
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncomeList.map((income) => (
                  <Link
                    key={income.id}
                    href={`/income/${income.id}/view`}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{income.item}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(income.date)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      +{formatCurrency(income.amount)}
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
