"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { FarmType, TeamRole } from "@/types/database";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Farm types
export const FARM_TYPES: FarmType[] = [
  "CROP",
  "LIVESTOCK",
  "DAIRY",
  "POULTRY",
  "MIXED",
  "ORGANIC",
  "VINEYARD",
  "ORCHARD",
  "AQUACULTURE",
  "OTHER",
];

// Schema for creating a farm
export const createFarmSchema = z.object({
  name: z.string().min(1, "Farm name is required").max(100),
  farm_type: z.enum([
    "CROP",
    "LIVESTOCK",
    "DAIRY",
    "POULTRY",
    "MIXED",
    "ORGANIC",
    "VINEYARD",
    "ORCHARD",
    "AQUACULTURE",
    "OTHER",
  ]),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip_code: z.string().max(20).optional(),
  country: z.string().max(100).optional().default("US"),
  acres: z.number().min(0).optional(),
  established_year: z.number().min(1800).max(new Date().getFullYear()).optional(),
  website: z.string().url().optional().or(z.literal("")),
  business_registration: z.string().max(100).optional(),
  tax_id: z.string().max(100).optional(),
  phone_number: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export type CreateFarmData = z.infer<typeof createFarmSchema>;

// Schema for updating a farm
export const updateFarmSchema = createFarmSchema.partial();

export type UpdateFarmData = z.infer<typeof updateFarmSchema>;

// Create a new farm
export async function createFarm(
  data: CreateFarmData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = createFarmSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    // Create farm
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .insert({
        owner_id: user.id,
        name: validatedData.data.name,
        farm_type: validatedData.data.farm_type,
        description: validatedData.data.description || null,
        address: validatedData.data.address || null,
        city: validatedData.data.city || null,
        state: validatedData.data.state || null,
        zip_code: validatedData.data.zip_code || null,
        country: validatedData.data.country || "US",
        acres: validatedData.data.acres || null,
        established_year: validatedData.data.established_year || null,
        website: validatedData.data.website || null,
        business_registration: validatedData.data.business_registration || null,
        tax_id: validatedData.data.tax_id || null,
        phone_number: validatedData.data.phone_number || null,
        email: validatedData.data.email || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (farmError) {
      console.error("Error creating farm:", farmError);
      return { success: false, error: "Failed to create farm" };
    }

    // Create owner as team member
    const { error: memberError } = await supabase.from("team_members").insert({
      farm_id: farm.id,
      user_id: user.id,
      role: "OWNER" as TeamRole,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error("Error creating team member:", memberError);
      // Clean up farm if team member creation fails
      await supabase.from("farms").delete().eq("id", farm.id);
      return { success: false, error: "Failed to set up farm ownership" };
    }

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true, data: { id: farm.id } };
  } catch (error) {
    console.error("Error in createFarm:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update a farm
export async function updateFarm(
  farmId: string,
  data: UpdateFarmData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = updateFarmSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    // Check if user has permission to update farm
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("role")
      .eq("farm_id", farmId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !member) {
      return { success: false, error: "You are not a member of this farm" };
    }

    const role = member.role as TeamRole;
    if (role !== "OWNER" && role !== "ADMIN") {
      return { success: false, error: "You do not have permission to update farm settings" };
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validatedData.data.name !== undefined) {
      updateData.name = validatedData.data.name;
    }
    if (validatedData.data.farm_type !== undefined) {
      updateData.farm_type = validatedData.data.farm_type;
    }
    if (validatedData.data.description !== undefined) {
      updateData.description = validatedData.data.description || null;
    }
    if (validatedData.data.address !== undefined) {
      updateData.address = validatedData.data.address || null;
    }
    if (validatedData.data.city !== undefined) {
      updateData.city = validatedData.data.city || null;
    }
    if (validatedData.data.state !== undefined) {
      updateData.state = validatedData.data.state || null;
    }
    if (validatedData.data.zip_code !== undefined) {
      updateData.zip_code = validatedData.data.zip_code || null;
    }
    if (validatedData.data.country !== undefined) {
      updateData.country = validatedData.data.country || null;
    }
    if (validatedData.data.acres !== undefined) {
      updateData.acres = validatedData.data.acres || null;
    }
    if (validatedData.data.established_year !== undefined) {
      updateData.established_year = validatedData.data.established_year || null;
    }
    if (validatedData.data.website !== undefined) {
      updateData.website = validatedData.data.website || null;
    }
    if (validatedData.data.business_registration !== undefined) {
      updateData.business_registration = validatedData.data.business_registration || null;
    }
    if (validatedData.data.tax_id !== undefined) {
      updateData.tax_id = validatedData.data.tax_id || null;
    }
    if (validatedData.data.phone_number !== undefined) {
      updateData.phone_number = validatedData.data.phone_number || null;
    }
    if (validatedData.data.email !== undefined) {
      updateData.email = validatedData.data.email || null;
    }

    // Update farm
    const { error: updateError } = await supabase
      .from("farms")
      .update(updateData)
      .eq("id", farmId);

    if (updateError) {
      console.error("Error updating farm:", updateError);
      return { success: false, error: "Failed to update farm" };
    }

    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateFarm:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Delete a farm (only for OWNER)
export async function deleteFarm(farmId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is the owner
    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("owner_id")
      .eq("id", farmId)
      .single();

    if (farmError || !farm) {
      return { success: false, error: "Farm not found" };
    }

    if (farm.owner_id !== user.id) {
      return { success: false, error: "Only the farm owner can delete the farm" };
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from("farms")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", farmId);

    if (deleteError) {
      console.error("Error deleting farm:", deleteError);
      return { success: false, error: "Failed to delete farm" };
    }

    // Deactivate all team members
    const { error: membersError } = await supabase
      .from("team_members")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("farm_id", farmId);

    if (membersError) {
      console.error("Error deactivating team members:", membersError);
    }

    // Cancel all pending invitations
    const { error: invitationsError } = await supabase
      .from("team_invitations")
      .update({ status: "CANCELLED" })
      .eq("farm_id", farmId)
      .eq("status", "PENDING");

    if (invitationsError) {
      console.error("Error cancelling invitations:", invitationsError);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteFarm:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Get farm by ID
export async function getFarm(farmId: string) {
  try {
    const supabase = await createClient();

    const { data: farm, error } = await supabase
      .from("farms")
      .select("*")
      .eq("id", farmId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching farm:", error);
      return null;
    }

    return farm;
  } catch (error) {
    console.error("Error in getFarm:", error);
    return null;
  }
}

// Get all farms for current user
export async function getUserFarms() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    // Get farms where user is a team member
    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select(
        `
        role,
        farm:farms (*)
      `
      )
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (membersError) {
      console.error("Error fetching user farms:", membersError);
      return [];
    }

    // Filter out inactive farms and add role info
    const farms = members
      .filter((m) => m.farm && (m.farm as { is_active: boolean }).is_active)
      .map((m) => ({
        ...m.farm,
        userRole: m.role,
      }));

    return farms;
  } catch (error) {
    console.error("Error in getUserFarms:", error);
    return [];
  }
}
