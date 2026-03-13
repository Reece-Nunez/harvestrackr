import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Settings, AlertCircle, AlertTriangle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FarmSettingsForm } from "@/components/forms/farm-settings-form";
import { DeleteFarmDialog } from "./delete-farm-dialog";
import { getUserRole } from "@/actions/team";
import type { TeamRole } from "@/schemas/team";

export const metadata = {
  title: "Settings | HarvesTrackr",
  description: "Manage your farm settings",
};

async function getCurrentFarmId() {
  const cookieStore = await cookies();
  const farmId = cookieStore.get("currentFarmId")?.value;
  if (farmId) return farmId;

  // Fall back to first farm
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("team_members")
    .select("farm_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return member?.farm_id || null;
}

async function getSettingsData(farmId: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get farm info
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("*")
    .eq("id", farmId)
    .eq("is_active", true)
    .single();

  if (farmError || !farm) return null;

  // Get user role
  const roleResult = await getUserRole(farmId);
  if (!roleResult.success || !roleResult.data) return null;

  return {
    farm,
    currentUserRole: roleResult.data,
    isOwner: farm.owner_id === user.id,
  };
}

export default async function SettingsPage() {
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage settings.
        </p>
      </div>
    );
  }

  const data = await getSettingsData(farmId);

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load farm settings. Please make sure you have access to this
          farm.
        </AlertDescription>
      </Alert>
    );
  }

  const canEdit =
    data.currentUserRole === "OWNER" || data.currentUserRole === "ADMIN";

  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Farm Settings</h1>
          <p className="text-muted-foreground">
            Manage settings for {data.farm.name}
          </p>
        </div>

        {/* Permission Notice */}
        {!canEdit && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>View Only</AlertTitle>
            <AlertDescription>
              You have view-only access to farm settings. Contact the farm owner
              or an admin to make changes.
            </AlertDescription>
          </Alert>
        )}

        {/* Farm Settings Form */}
        <FarmSettingsForm farm={data.farm} canEdit={canEdit} />

        {/* Danger Zone - Only for Owner */}
        {data.isOwner && (
          <>
            <Separator />
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
                  <div>
                    <h4 className="font-medium">Delete this farm</h4>
                    <p className="text-sm text-muted-foreground">
                      Once deleted, all farm data will be permanently removed.
                      This action cannot be undone.
                    </p>
                  </div>
                  <DeleteFarmDialog
                    farmId={data.farm.id}
                    farmName={data.farm.name}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Suspense>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
