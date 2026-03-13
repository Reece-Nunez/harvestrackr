import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Dog,
  Egg,
  MapPin,
  Package,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getInventorySummary } from "@/actions/inventory";

export const metadata = {
  title: "Inventory | HarvesTrackr",
  description: "Manage your farm inventory, livestock, and fields",
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

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function SummaryCard({ title, value, description, icon, href }: SummaryCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-primary">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

async function InventoryDashboard({ farmId }: { farmId: string }) {
  const summary = await getInventorySummary(farmId);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Livestock"
          value={summary.livestockCount}
          description="Active animals"
          icon={<Dog className="h-5 w-5" />}
          href="/inventory/livestock"
        />
        <SummaryCard
          title="Chicken Flocks"
          value={`${summary.chickenFlockCount} (${summary.totalChickens} birds)`}
          description={`${summary.recentEggs} eggs this week`}
          icon={<Egg className="h-5 w-5" />}
          href="/inventory/chickens"
        />
        <SummaryCard
          title="Fields"
          value={summary.fieldCount}
          description="Registered locations"
          icon={<MapPin className="h-5 w-5" />}
          href="/inventory/fields"
        />
        <SummaryCard
          title="Inventory Items"
          value={summary.inventoryItemCount}
          description="Supplies & equipment"
          icon={<Package className="h-5 w-5" />}
          href="/inventory/items"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/inventory/livestock">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Livestock Management
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Manage your cattle, pigs, goats, and other animals
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/inventory/chickens">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Chicken & Eggs
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Track flocks, log daily egg collection
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/inventory/fields">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Field Management
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Organize pastures, barns, and storage areas
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/inventory/items">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Inventory Items
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Track feed, seeds, tools, and supplies
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Alerts Section */}
      {summary.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Items that need to be restocked soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="secondary">
                    {item.quantity} remaining
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/inventory/items?lowStock=true">
                View All Low Stock Items
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Weekly Egg Production
          </CardTitle>
          <CardDescription>
            {summary.recentEggs} eggs collected in the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">
                {summary.recentEggs}
              </div>
              <p className="text-muted-foreground mt-2">eggs this week</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/inventory/chickens">Log Eggs</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function InventoryPage() {
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage inventory.
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
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your farm&apos;s livestock, fields, and supplies
          </p>
        </div>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <InventoryDashboard farmId={farmId} />
      </Suspense>
    </div>
  );
}
