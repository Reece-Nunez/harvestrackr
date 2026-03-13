import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Dog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LivestockProfile } from "./livestock-profile";
import {
  getLivestockById,
  getFields,
  getLivestockFamilies,
  getLivestock,
} from "@/actions/inventory";

export const metadata = {
  title: "Livestock Profile | HarvesTrackr",
  description: "View and manage livestock details",
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

export default async function LivestockProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Dog className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to view livestock.
        </p>
        <Button asChild>
          <Link href="/farms/new">Create Farm</Link>
        </Button>
      </div>
    );
  }

  const [livestock, fields, families, allLivestock] = await Promise.all([
    getLivestockById(id, farmId),
    getFields(farmId),
    getLivestockFamilies(id),
    getLivestock(farmId, { pageSize: 100 }), // Get all livestock for family selection
  ]);

  if (!livestock) {
    notFound();
  }

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
        <span className="text-foreground">{livestock.name}</span>
      </div>

      <LivestockProfile
        livestock={livestock}
        fields={fields}
        families={families}
        allLivestock={allLivestock.livestock}
        isEditing={edit === "true"}
      />
    </div>
  );
}
