import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryItemsManagement } from "./inventory-items-management";
import { getInventoryItems } from "@/actions/inventory";

export const metadata = {
  title: "Inventory Items | HarvesTrackr",
  description: "Manage your farm supplies and equipment",
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

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    lowStock?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage inventory items.
        </p>
        <Button asChild>
          <Link href="/farms/new">Create Farm</Link>
        </Button>
      </div>
    );
  }

  const result = await getInventoryItems(farmId, {
    type: params.type as "FEED" | "SEED" | "FERTILIZER" | "PESTICIDE" | "EQUIPMENT" | "TOOL" | "SUPPLY" | "OTHER" | undefined,
    lowStockOnly: params.lowStock === "true",
    search: params.search,
    sortBy: params.sortBy as "name" | "type" | "quantity" | "expiry_date" | undefined,
    sortOrder: params.sortOrder as "asc" | "desc" | undefined,
    page: parseInt(params.page || "1"),
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">
          Inventory
        </Link>
        <span>/</span>
        <span className="text-foreground">Items</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventory Items
          </h1>
          <p className="text-muted-foreground">
            Track feed, seeds, tools, and other supplies
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<ItemsSkeleton />}>
        <InventoryItemsManagement
          farmId={farmId}
          items={result.items}
          total={result.total}
          page={result.page ?? 1}
          totalPages={result.totalPages ?? 1}
          searchParams={params}
        />
      </Suspense>
    </div>
  );
}

function ItemsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
