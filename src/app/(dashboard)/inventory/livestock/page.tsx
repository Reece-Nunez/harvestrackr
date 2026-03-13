import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Plus, Dog, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LivestockList } from "./livestock-list";
import { getFields } from "@/actions/inventory";

export const metadata = {
  title: "Livestock | HarvesTrackr",
  description: "Manage your farm livestock",
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

export default async function LivestockPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    species?: string;
    status?: string;
    fieldId?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Dog className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage livestock.
        </p>
        <Button asChild>
          <Link href="/farms/new">Create Farm</Link>
        </Button>
      </div>
    );
  }

  const fields = await getFields(farmId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Livestock</h1>
          <p className="text-muted-foreground">
            Manage your cattle, pigs, goats, and other farm animals
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/livestock/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Livestock
          </Link>
        </Button>
      </div>

      {/* Livestock List */}
      <Suspense fallback={<LivestockListSkeleton />}>
        <LivestockList
          farmId={farmId}
          fields={fields}
          page={parseInt(params.page || "1")}
          search={params.search}
          species={params.species}
          status={params.status}
          fieldId={params.fieldId}
          sortBy={params.sortBy as "name" | "species" | "created_at" | undefined}
          sortOrder={params.sortOrder as "asc" | "desc" | undefined}
        />
      </Suspense>
    </div>
  );
}

function LivestockListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
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
