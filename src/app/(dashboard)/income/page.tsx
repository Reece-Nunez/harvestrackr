import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomeDataTable } from "./income-data-table";

export const metadata = {
  title: "Income | HarvestTrackr",
  description: "Manage your farm income records",
};

async function getIncomeData(farmId: string) {
  const supabase = await createClient();

  const { data: income, error } = await supabase
    .from("income")
    .select("*")
    .eq("farm_id", farmId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching income:", error);
    return [];
  }

  return income || [];
}

async function getCurrentFarm() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's first farm (this will be overridden by client-side farm selection)
  const { data: farms } = await supabase
    .from("farms")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("name")
    .limit(1);

  return farms?.[0] || null;
}

function IncomeTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-3">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[60px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function IncomePage() {
  const farm = await getCurrentFarm();

  if (!farm) {
    redirect("/");
  }

  const income = await getIncomeData(farm.id);

  // Calculate summary statistics
  const totalIncome = income.reduce((sum, record) => sum + (record.amount || 0), 0);
  const thisMonthIncome = income
    .filter((record) => {
      const recordDate = new Date(record.date);
      const now = new Date();
      return (
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, record) => sum + (record.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Income</h1>
          <p className="text-muted-foreground">
            Track and manage your farm income records
          </p>
        </div>
        <Link href="/income/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              All time income records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${thisMonthIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Income this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{income.length}</div>
            <p className="text-xs text-muted-foreground">
              Income entries recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income Table */}
      <Card>
        <CardHeader>
          <CardTitle>Income Records</CardTitle>
          <CardDescription>
            A list of all income transactions for your farm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<IncomeTableSkeleton />}>
            <IncomeDataTable data={income} farmId={farm.id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
