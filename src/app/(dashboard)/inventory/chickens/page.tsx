import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Egg, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChickenManagement } from "./chicken-management";
import { getChickenFlocks, getEggLogs } from "@/actions/inventory";

export const metadata = {
  title: "Chickens & Eggs | HarvesTrackr",
  description: "Manage your chicken flocks and track egg production",
};

async function getCurrentFarmId() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;
  if (farmId) return farmId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: farms } = await supabase
    .from("farms")
    .select("id")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  return farms?.[0]?.id || null;
}

export default async function ChickensPage() {
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Egg className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage chickens.
        </p>
        <Button asChild>
          <Link href="/farms/new">Create Farm</Link>
        </Button>
      </div>
    );
  }

  const [flocks, eggLogs] = await Promise.all([
    getChickenFlocks(farmId),
    getEggLogs(farmId),
  ]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">
          Inventory
        </Link>
        <span>/</span>
        <span className="text-foreground">Chickens & Eggs</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Chickens & Eggs
          </h1>
          <p className="text-muted-foreground">
            Manage your flocks and track daily egg production
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<ChickensSkeleton />}>
        <ChickenManagement farmId={farmId} flocks={flocks} eggLogs={eggLogs} />
      </Suspense>
    </div>
  );
}

function ChickensSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
