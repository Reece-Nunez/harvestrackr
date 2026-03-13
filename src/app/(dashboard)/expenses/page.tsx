import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Plus, Receipt, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpensesList } from "./expenses-list";

export const metadata = {
  title: "Expenses | HarvesTrackr",
  description: "Manage your farm expenses",
};

async function getCurrentFarmId() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;
  if (farmId) return farmId;

  // Fall back to first farm (owned or member)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try owned farms first
  const { data: ownedFarms } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  if (ownedFarms?.[0]?.id) return ownedFarms[0].id;

  // Try team_members
  const { data: teamMemberships } = await supabase
    .from("team_members")
    .select("farm_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  if (teamMemberships?.[0]?.farm_id) return teamMemberships[0].farm_id;

  // Try farm_members (migration table)
  const { data: farmMemberships } = await (supabase as any)
    .from("farm_members")
    .select("farm_id")
    .eq("user_id", user.id)
    .limit(1);

  return farmMemberships?.[0]?.farm_id || null;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to view expenses.
        </p>
        <Button asChild>
          <Link href="/farms/new">Create Farm</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage your farm expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/scan-receipt">
              <ScanLine className="h-4 w-4 mr-2" />
              Scan Receipt
            </Link>
          </Button>
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      <Suspense fallback={<ExpensesListSkeleton />}>
        <ExpensesList
          farmId={farmId}
          page={parseInt(params.page || "1")}
          search={params.search}
          category={params.category}
          startDate={params.startDate}
          endDate={params.endDate}
          sortBy={params.sortBy as "date" | "vendor" | "grand_total" | undefined}
          sortOrder={params.sortOrder as "asc" | "desc" | undefined}
        />
      </Suspense>
    </div>
  );
}

function ExpensesListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
