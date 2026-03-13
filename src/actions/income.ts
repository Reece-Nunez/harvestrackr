"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { incomeSchema, type IncomeFormData } from "@/schemas/income";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createIncome(
  farmId: string,
  formData: IncomeFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // Validate the form data
    const validatedData = incomeSchema.parse(formData);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user has access to the farm
    const { data: farmAccess } = await supabase
      .from("farms")
      .select("id")
      .eq("id", farmId)
      .eq("owner_id", user.id)
      .single();

    if (!farmAccess) {
      // Check if user is a team member
      const { data: teamAccess } = await supabase
        .from("team_members")
        .select("id")
        .eq("farm_id", farmId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!teamAccess) {
        return { success: false, error: "You do not have access to this farm" };
      }
    }

    // Create the income record
    const { data: income, error: insertError } = await supabase
      .from("income")
      .insert({
        farm_id: farmId,
        user_id: user.id,
        date: validatedData.date.toISOString().split("T")[0],
        item: validatedData.item,
        quantity: validatedData.quantity,
        price: validatedData.price,
        amount: validatedData.amount,
        payment_method: validatedData.paymentMethod || null,
        notes: validatedData.notes || null,
        livestock_id: validatedData.livestockId || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating income:", insertError);
      return { success: false, error: "Failed to create income record" };
    }

    // If livestock is linked, update its status to SOLD
    if (validatedData.livestockId) {
      const { error: livestockError } = await supabase
        .from("livestock")
        .update({
          status: "SOLD",
          field_id: null,
        })
        .eq("id", validatedData.livestockId)
        .eq("farm_id", farmId);

      if (livestockError) {
        console.error("Error updating livestock status:", livestockError);
        // Don't fail the whole operation, income was created successfully
      }
    }

    revalidatePath("/income");
    return { success: true, data: { id: income.id } };
  } catch (error) {
    console.error("Error in createIncome:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateIncome(
  id: string,
  farmId: string,
  formData: IncomeFormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Validate the form data
    const validatedData = incomeSchema.parse(formData);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the existing income record to check for livestock changes
    const { data: existingIncome, error: fetchError } = await supabase
      .from("income")
      .select("livestock_id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingIncome) {
      return { success: false, error: "Income record not found" };
    }

    // Update the income record
    const { error: updateError } = await supabase
      .from("income")
      .update({
        date: validatedData.date.toISOString().split("T")[0],
        item: validatedData.item,
        quantity: validatedData.quantity,
        price: validatedData.price,
        amount: validatedData.amount,
        payment_method: validatedData.paymentMethod || null,
        notes: validatedData.notes || null,
        livestock_id: validatedData.livestockId || null,
      })
      .eq("id", id)
      .eq("farm_id", farmId);

    if (updateError) {
      console.error("Error updating income:", updateError);
      return { success: false, error: "Failed to update income record" };
    }

    // Handle livestock status changes
    const oldLivestockId = existingIncome.livestock_id;
    const newLivestockId = validatedData.livestockId;

    // If livestock was removed, set it back to ACTIVE
    if (oldLivestockId && oldLivestockId !== newLivestockId) {
      await supabase
        .from("livestock")
        .update({ status: "ACTIVE" })
        .eq("id", oldLivestockId)
        .eq("farm_id", farmId);
    }

    // If new livestock is linked, set it to SOLD
    if (newLivestockId && newLivestockId !== oldLivestockId) {
      await supabase
        .from("livestock")
        .update({ status: "SOLD", field_id: null })
        .eq("id", newLivestockId)
        .eq("farm_id", farmId);
    }

    revalidatePath("/income");
    revalidatePath(`/income/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in updateIncome:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteIncome(
  id: string,
  farmId: string
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

    // Get the income record to check for linked livestock
    const { data: income, error: fetchError } = await supabase
      .from("income")
      .select("livestock_id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !income) {
      return { success: false, error: "Income record not found" };
    }

    // Delete the income record
    const { error: deleteError } = await supabase
      .from("income")
      .delete()
      .eq("id", id)
      .eq("farm_id", farmId);

    if (deleteError) {
      console.error("Error deleting income:", deleteError);
      return { success: false, error: "Failed to delete income record" };
    }

    // If livestock was linked, set it back to ACTIVE
    if (income.livestock_id) {
      await supabase
        .from("livestock")
        .update({ status: "ACTIVE" })
        .eq("id", income.livestock_id)
        .eq("farm_id", farmId);
    }

    revalidatePath("/income");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in deleteIncome:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function linkLivestockToIncome(
  incomeId: string,
  livestockId: string,
  farmId: string
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

    // Update the income record with the livestock ID
    const { error: updateIncomeError } = await supabase
      .from("income")
      .update({ livestock_id: livestockId })
      .eq("id", incomeId)
      .eq("farm_id", farmId);

    if (updateIncomeError) {
      console.error("Error linking livestock to income:", updateIncomeError);
      return { success: false, error: "Failed to link livestock to income" };
    }

    // Update the livestock status to SOLD
    const { error: updateLivestockError } = await supabase
      .from("livestock")
      .update({
        status: "SOLD",
        field_id: null,
      })
      .eq("id", livestockId)
      .eq("farm_id", farmId);

    if (updateLivestockError) {
      console.error("Error updating livestock status:", updateLivestockError);
      return { success: false, error: "Failed to update livestock status" };
    }

    revalidatePath("/income");
    revalidatePath(`/income/${incomeId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error in linkLivestockToIncome:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getActiveLivestock(farmId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("livestock")
      .select("id, name, species, tag_number")
      .eq("farm_id", farmId)
      .eq("status", "ACTIVE")
      .order("name");

    if (error) {
      console.error("Error fetching livestock:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getActiveLivestock:", error);
    return [];
  }
}
