import { cookies } from "next/headers";
import Link from "next/link";
import { Dog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LivestockForm } from "@/components/forms/livestock-form";
import { getFields } from "@/actions/inventory";

export const metadata = {
  title: "Add Livestock | HarvesTrackr",
  description: "Add a new animal to your farm",
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

export default async function NewLivestockPage() {
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Dog className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to add livestock.
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">
          Inventory
        </Link>
        <span>/</span>
        <Link href="/inventory/livestock" className="hover:text-foreground">
          Livestock
        </Link>
        <span>/</span>
        <span className="text-foreground">New</span>
      </div>

      <LivestockForm fields={fields} mode="create" />
    </div>
  );
}
