import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TeamManagement } from "./team-management";
import { getTeamMembers, getPendingInvitations, getUserRole } from "@/actions/team";
import type { TeamRole, TeamInvitationWithInviter } from "@/schemas/team";

export const metadata = {
  title: "Team | HarvesTrackr",
  description: "Manage your farm team members and invitations",
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

async function getTeamData(farmId: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get farm info
  const { data: farm, error: farmError } = await supabase
    .from("farms")
    .select("id, name")
    .eq("id", farmId)
    .eq("is_active", true)
    .single();

  if (farmError || !farm) return null;

  // Get user role
  const roleResult = await getUserRole(farmId);
  if (!roleResult.success || !roleResult.data) return null;

  // Get team members
  const membersResult = await getTeamMembers(farmId);
  const members = membersResult.success ? membersResult.data || [] : [];

  // Get pending invitations (only for OWNER/ADMIN)
  let invitations: TeamInvitationWithInviter[] = [];
  if (roleResult.data === "OWNER" || roleResult.data === "ADMIN") {
    const invitationsResult = await getPendingInvitations(farmId);
    if (invitationsResult.success && invitationsResult.data) {
      invitations = invitationsResult.data;
    }
  }

  return {
    farm,
    currentUserRole: roleResult.data,
    currentUserId: user.id,
    members,
    invitations,
  };
}

export default async function TeamPage() {
  const farmId = await getCurrentFarmId();

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
        <p className="text-muted-foreground mb-4">
          Please create or select a farm to manage your team.
        </p>
      </div>
    );
  }

  const data = await getTeamData(farmId);

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load team data. Please make sure you have access to this farm.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Suspense fallback={<TeamPageSkeleton />}>
      <TeamManagement
        farmId={farmId}
        farmName={data.farm.name}
        currentUserRole={data.currentUserRole}
        currentUserId={data.currentUserId}
        initialMembers={data.members}
        initialInvitations={data.invitations || []}
      />
    </Suspense>
  );
}

function TeamPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
