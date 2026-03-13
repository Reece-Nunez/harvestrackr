import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FarmProvider } from "@/components/providers/farm-provider";
import type { Farm, User } from "@/types/database";

// Type for profiles table (used by migration scripts)
interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Type for farm_members table (used by migration scripts)
interface FarmMemberRow {
  farm_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check for authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Fetch user profile - try 'users' table first, fall back to 'profiles'
  let userProfile: User | null = null;

  const { data: usersData } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (usersData) {
    userProfile = usersData;
  } else {
    // Fall back to profiles table (used by migration scripts)
    // Using type assertion since profiles table isn't in generated types
    const { data: profilesData } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single() as { data: ProfileRow | null };

    if (profilesData) {
      // Map profiles schema to users schema
      const nameParts = (profilesData.full_name || "").split(" ");
      userProfile = {
        id: profilesData.id,
        email: profilesData.email,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(" ") || null,
        avatar_url: profilesData.avatar_url || null,
        preferences: null,
        created_at: profilesData.created_at,
        updated_at: profilesData.updated_at,
      };
    }
  }

  // Fetch user's farms (owned and team member)
  const { data: ownedFarms } = await supabase
    .from("farms")
    .select("*")
    .eq("owner_id", authUser.id)
    .eq("is_active", true)
    .order("name");

  // Try team_members first, fall back to farm_members (used by migration)
  let teamFarmIds: string[] = [];

  const { data: teamMembersData } = await supabase
    .from("team_members")
    .select("farm_id")
    .eq("user_id", authUser.id)
    .eq("is_active", true);

  if (teamMembersData && teamMembersData.length > 0) {
    teamFarmIds = teamMembersData.map((tm) => tm.farm_id);
  } else {
    // Fall back to farm_members table (used by migration scripts)
    const { data: farmMembersData } = await (supabase as any)
      .from("farm_members")
      .select("farm_id")
      .eq("user_id", authUser.id) as { data: FarmMemberRow[] | null };

    if (farmMembersData) {
      teamFarmIds = farmMembersData.map((tm) => tm.farm_id);
    }
  }

  let teamFarms: Farm[] = [];
  if (teamFarmIds.length > 0) {
    const { data } = await supabase
      .from("farms")
      .select("*")
      .in("id", teamFarmIds)
      .eq("is_active", true)
      .order("name");
    teamFarms = data || [];
  }

  // Combine and deduplicate farms
  const allFarms = [...(ownedFarms || []), ...teamFarms];
  const uniqueFarms = allFarms.reduce((acc: Farm[], farm) => {
    if (!acc.find((f) => f.id === farm.id)) {
      acc.push(farm);
    }
    return acc;
  }, []);

  // Set initial farm (could come from cookie/localStorage preference)
  const initialFarm = uniqueFarms[0] || null;

  return (
    <FarmProvider
      initialFarms={uniqueFarms}
      initialCurrentFarm={initialFarm}
      initialUser={userProfile}
    >
      <DashboardShell>{children}</DashboardShell>
    </FarmProvider>
  );
}
