import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Farm } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's owned farms
    const { data: ownedFarms, error: ownedError } = await supabase
      .from("farms")
      .select("*")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .order("name");

    if (ownedError) {
      console.error("Error fetching owned farms:", ownedError);
      throw ownedError;
    }

    // Fetch farms where user is a team member
    const { data: teamMemberships } = await supabase
      .from("team_members")
      .select("farm_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const teamFarmIds = teamMemberships?.map((tm) => tm.farm_id) || [];

    let teamFarms: Farm[] = [];
    if (teamFarmIds.length > 0) {
      const { data, error: teamError } = await supabase
        .from("farms")
        .select("*")
        .in("id", teamFarmIds)
        .eq("is_active", true)
        .order("name");

      if (teamError) {
        console.error("Error fetching team farms:", teamError);
        throw teamError;
      }

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

    return NextResponse.json({ farms: uniqueFarms });
  } catch (error) {
    console.error("Failed to fetch farms:", error);
    return NextResponse.json(
      { error: "Failed to fetch farms" },
      { status: 500 }
    );
  }
}
