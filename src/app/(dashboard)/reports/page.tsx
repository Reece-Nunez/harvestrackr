import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsGenerator } from "./reports-generator";

export const metadata = {
  title: "Reports | HarvesTrackr",
  description: "Generate and export farm reports",
};

async function getCurrentFarm() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  if (farmId) {
    const { data: farm } = await supabase
      .from("farms")
      .select("id, name")
      .eq("id", farmId)
      .single();

    if (farm) return farm;
  }

  // Fall back to first farm
  const { data: farms } = await supabase
    .from("farms")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .limit(1);

  return farms?.[0] || null;
}

export default async function ReportsPage() {
  const farm = await getCurrentFarm();

  if (!farm) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to generate reports.
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
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export detailed reports for your farm
          </p>
        </div>
      </div>

      {/* Reports Generator */}
      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsGenerator farmId={farm.id} farmName={farm.name} />
      </Suspense>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[200px]" />
      </div>
      <div className="lg:col-span-2">
        <Skeleton className="h-[600px]" />
      </div>
    </div>
  );
}
