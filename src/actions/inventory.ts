"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createLivestockSchema,
  updateLivestockSchema,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  createChickenFlockSchema,
  updateChickenFlockSchema,
  createEggLogSchema,
  createFieldSchema,
  updateFieldSchema,
  createInventoryItemSchema,
  updateInventoryItemSchema,
  createLivestockFamilySchema,
  type CreateLivestockData,
  type UpdateLivestockData,
  type CreateMedicalRecordData,
  type UpdateMedicalRecordData,
  type CreateChickenFlockData,
  type UpdateChickenFlockData,
  type CreateEggLogData,
  type CreateFieldData,
  type UpdateFieldData,
  type CreateInventoryItemData,
  type UpdateInventoryItemData,
  type CreateLivestockFamilyData,
} from "@/schemas/inventory";

// Result type for actions
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ================== LIVESTOCK ACTIONS ==================

export async function createLivestock(
  data: CreateLivestockData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createLivestockSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { farmId, ...livestockData } = validatedData.data;

    const { data: livestock, error } = await supabase
      .from("livestock")
      .insert({
        farm_id: farmId,
        name: livestockData.name,
        species: livestockData.species,
        breed: livestockData.breed,
        tag_number: livestockData.tagNumber,
        birth_date: livestockData.birthDate,
        weight: livestockData.weight,
        gender: livestockData.gender,
        status: livestockData.status,
        field_id: livestockData.fieldId,
        acquisition_date: livestockData.acquisitionDate,
        acquisition_cost: livestockData.acquisitionCost,
        notes: livestockData.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating livestock:", error);
      return { success: false, error: "Failed to create livestock" };
    }

    revalidatePath("/inventory/livestock");
    revalidatePath("/inventory");
    return { success: true, data: { id: livestock.id } };
  } catch (error) {
    console.error("Error in createLivestock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateLivestock(
  data: UpdateLivestockData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateLivestockSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, farmId, ...livestockData } = validatedData.data;

    const { error } = await supabase
      .from("livestock")
      .update({
        name: livestockData.name,
        species: livestockData.species,
        breed: livestockData.breed,
        tag_number: livestockData.tagNumber,
        birth_date: livestockData.birthDate,
        weight: livestockData.weight,
        gender: livestockData.gender,
        status: livestockData.status,
        field_id: livestockData.fieldId,
        acquisition_date: livestockData.acquisitionDate,
        acquisition_cost: livestockData.acquisitionCost,
        notes: livestockData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error updating livestock:", error);
      return { success: false, error: "Failed to update livestock" };
    }

    revalidatePath("/inventory/livestock");
    revalidatePath(`/inventory/livestock/${id}`);
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in updateLivestock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteLivestock(
  id: string,
  farmId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete related medical records first
    await supabase.from("medical_records").delete().eq("livestock_id", id);

    // Delete related family links
    await supabase
      .from("livestock_families")
      .delete()
      .or(`parent_id.eq.${id},child_id.eq.${id}`);

    // Delete the livestock
    const { error } = await supabase
      .from("livestock")
      .delete()
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error deleting livestock:", error);
      return { success: false, error: "Failed to delete livestock" };
    }

    revalidatePath("/inventory/livestock");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteLivestock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLivestockById(id: string, farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("livestock")
    .select(
      `
      *,
      field:fields(id, name),
      medical_records(*),
      income(*)
    `
    )
    .eq("id", id)
    .eq("farm_id", farmId)
    .single();

  if (error) {
    console.error("Error fetching livestock:", error);
    return null;
  }

  return data;
}

export async function getLivestock(
  farmId: string,
  options: {
    species?: string;
    status?: "ACTIVE" | "SOLD" | "DECEASED" | "TRANSFERRED";
    fieldId?: string;
    search?: string;
    sortBy?: "name" | "species" | "created_at";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();

  const {
    species,
    status,
    fieldId,
    search,
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = options;

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("livestock")
    .select(
      `
      *,
      field:fields(id, name)
    `,
      { count: "exact" }
    )
    .eq("farm_id", farmId);

  if (species) {
    query = query.eq("species", species);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (fieldId) {
    query = query.eq("field_id", fieldId);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,tag_number.ilike.%${search}%`);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching livestock:", error);
    return { livestock: [], total: 0 };
  }

  return {
    livestock: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ================== MEDICAL RECORD ACTIONS ==================

export async function createMedicalRecord(
  data: CreateMedicalRecordData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createMedicalRecordSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { livestockId, ...recordData } = validatedData.data;

    const { data: record, error } = await supabase
      .from("medical_records")
      .insert({
        livestock_id: livestockId,
        type: recordData.type,
        date: recordData.date,
        description: recordData.description,
        medicine: recordData.medicine,
        dosage: recordData.dosage,
        administered_by: recordData.administeredBy,
        follow_up_date: recordData.followUpDate,
        notes: recordData.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating medical record:", error);
      return { success: false, error: "Failed to create medical record" };
    }

    revalidatePath(`/inventory/livestock/${livestockId}`);
    return { success: true, data: { id: record.id } };
  } catch (error) {
    console.error("Error in createMedicalRecord:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateMedicalRecord(
  data: UpdateMedicalRecordData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateMedicalRecordSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, livestockId, ...recordData } = validatedData.data;

    const { error } = await supabase
      .from("medical_records")
      .update({
        type: recordData.type,
        date: recordData.date,
        description: recordData.description,
        medicine: recordData.medicine,
        dosage: recordData.dosage,
        administered_by: recordData.administeredBy,
        follow_up_date: recordData.followUpDate,
        notes: recordData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("livestock_id", livestockId);

    if (error) {
      console.error("Error updating medical record:", error);
      return { success: false, error: "Failed to update medical record" };
    }

    revalidatePath(`/inventory/livestock/${livestockId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateMedicalRecord:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteMedicalRecord(
  id: string,
  livestockId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("medical_records")
      .delete()
      .eq("id", id)
      .eq("livestock_id", livestockId);

    if (error) {
      console.error("Error deleting medical record:", error);
      return { success: false, error: "Failed to delete medical record" };
    }

    revalidatePath(`/inventory/livestock/${livestockId}`);
    return { success: true };
  } catch (error) {
    console.error("Error in deleteMedicalRecord:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ================== CHICKEN FLOCK ACTIONS ==================

export async function createChickenFlock(
  data: CreateChickenFlockData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createChickenFlockSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { farmId, ...flockData } = validatedData.data;

    const { data: flock, error } = await supabase
      .from("chicken_flocks")
      .insert({
        farm_id: farmId,
        breed: flockData.breed,
        count: flockData.count,
        has_rooster: flockData.hasRooster,
        coop_location: flockData.coopLocation,
        notes: flockData.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating chicken flock:", error);
      return { success: false, error: "Failed to create chicken flock" };
    }

    revalidatePath("/inventory/chickens");
    revalidatePath("/inventory");
    return { success: true, data: { id: flock.id } };
  } catch (error) {
    console.error("Error in createChickenFlock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateChickenFlock(
  data: UpdateChickenFlockData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateChickenFlockSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, farmId, ...flockData } = validatedData.data;

    const { error } = await supabase
      .from("chicken_flocks")
      .update({
        breed: flockData.breed,
        count: flockData.count,
        has_rooster: flockData.hasRooster,
        coop_location: flockData.coopLocation,
        notes: flockData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error updating chicken flock:", error);
      return { success: false, error: "Failed to update chicken flock" };
    }

    revalidatePath("/inventory/chickens");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in updateChickenFlock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteChickenFlock(
  id: string,
  farmId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Delete related egg logs first
    await supabase.from("egg_logs").delete().eq("flock_id", id);

    const { error } = await supabase
      .from("chicken_flocks")
      .delete()
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error deleting chicken flock:", error);
      return { success: false, error: "Failed to delete chicken flock" };
    }

    revalidatePath("/inventory/chickens");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteChickenFlock:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getChickenFlocks(farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chicken_flocks")
    .select(
      `
      *,
      egg_logs(*)
    `
    )
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching chicken flocks:", error);
    return [];
  }

  return data || [];
}

// ================== EGG LOG ACTIONS ==================

export async function createEggLog(
  data: CreateEggLogData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createEggLogSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { data: log, error } = await supabase
      .from("egg_logs")
      .insert({
        flock_id: validatedData.data.flockId,
        date: validatedData.data.date,
        eggs_collected: validatedData.data.eggsCollected,
        notes: validatedData.data.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating egg log:", error);
      return { success: false, error: "Failed to create egg log" };
    }

    revalidatePath("/inventory/chickens");
    return { success: true, data: { id: log.id } };
  } catch (error) {
    console.error("Error in createEggLog:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteEggLog(
  id: string,
  flockId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("egg_logs")
      .delete()
      .eq("id", id)
      .eq("flock_id", flockId);

    if (error) {
      console.error("Error deleting egg log:", error);
      return { success: false, error: "Failed to delete egg log" };
    }

    revalidatePath("/inventory/chickens");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteEggLog:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getEggLogs(farmId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("egg_logs")
    .select(
      `
      *,
      flock:chicken_flocks!inner(id, breed, farm_id)
    `
    )
    .eq("flock.farm_id", farmId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching egg logs:", error);
    return [];
  }

  return data || [];
}

// ================== FIELD ACTIONS ==================

export async function createField(
  data: CreateFieldData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createFieldSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { farmId, ...fieldData } = validatedData.data;

    const { data: field, error } = await supabase
      .from("fields")
      .insert({
        farm_id: farmId,
        name: fieldData.name,
        acres: fieldData.acres,
        description: fieldData.description,
        field_type: fieldData.fieldType,
        notes: fieldData.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating field:", error);
      return { success: false, error: "Failed to create field" };
    }

    revalidatePath("/inventory/fields");
    revalidatePath("/inventory");
    return { success: true, data: { id: field.id } };
  } catch (error) {
    console.error("Error in createField:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateField(
  data: UpdateFieldData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateFieldSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, farmId, ...fieldData } = validatedData.data;

    const { error } = await supabase
      .from("fields")
      .update({
        name: fieldData.name,
        acres: fieldData.acres,
        description: fieldData.description,
        field_type: fieldData.fieldType,
        notes: fieldData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error updating field:", error);
      return { success: false, error: "Failed to update field" };
    }

    revalidatePath("/inventory/fields");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in updateField:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteField(
  id: string,
  farmId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Remove field reference from livestock
    await supabase
      .from("livestock")
      .update({ field_id: null })
      .eq("field_id", id);

    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error deleting field:", error);
      return { success: false, error: "Failed to delete field" };
    }

    revalidatePath("/inventory/fields");
    revalidatePath("/inventory/livestock");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteField:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getFields(farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fields")
    .select(
      `
      *,
      livestock(id, name, species)
    `
    )
    .eq("farm_id", farmId)
    .order("name");

  if (error) {
    console.error("Error fetching fields:", error);
    return [];
  }

  return data || [];
}

// ================== INVENTORY ITEM ACTIONS ==================

export async function createInventoryItem(
  data: CreateInventoryItemData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createInventoryItemSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { farmId, ...itemData } = validatedData.data;

    const { data: item, error } = await supabase
      .from("inventory_items")
      .insert({
        farm_id: farmId,
        name: itemData.name,
        type: itemData.type,
        quantity: itemData.quantity,
        unit: itemData.unit,
        location: itemData.location,
        acquired_date: itemData.acquiredDate,
        expiry_date: itemData.expiryDate,
        cost: itemData.cost,
        notes: itemData.notes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating inventory item:", error);
      return { success: false, error: "Failed to create inventory item" };
    }

    revalidatePath("/inventory/items");
    revalidatePath("/inventory");
    return { success: true, data: { id: item.id } };
  } catch (error) {
    console.error("Error in createInventoryItem:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateInventoryItem(
  data: UpdateInventoryItemData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = updateInventoryItemSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, farmId, ...itemData } = validatedData.data;

    const { error } = await supabase
      .from("inventory_items")
      .update({
        name: itemData.name,
        type: itemData.type,
        quantity: itemData.quantity,
        unit: itemData.unit,
        location: itemData.location,
        acquired_date: itemData.acquiredDate,
        expiry_date: itemData.expiryDate,
        cost: itemData.cost,
        notes: itemData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error updating inventory item:", error);
      return { success: false, error: "Failed to update inventory item" };
    }

    revalidatePath("/inventory/items");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in updateInventoryItem:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteInventoryItem(
  id: string,
  farmId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .eq("farm_id", farmId);

    if (error) {
      console.error("Error deleting inventory item:", error);
      return { success: false, error: "Failed to delete inventory item" };
    }

    revalidatePath("/inventory/items");
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteInventoryItem:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getInventoryItems(
  farmId: string,
  options: {
    type?: "FEED" | "SEED" | "FERTILIZER" | "PESTICIDE" | "EQUIPMENT" | "TOOL" | "SUPPLY" | "OTHER";
    lowStockOnly?: boolean;
    search?: string;
    sortBy?: "name" | "type" | "quantity" | "expiry_date";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();

  const {
    type,
    lowStockOnly,
    search,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 20,
  } = options;

  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("inventory_items")
    .select("*", { count: "exact" })
    .eq("farm_id", farmId);

  if (type) {
    query = query.eq("type", type);
  }
  if (lowStockOnly) {
    query = query.lte("quantity", 5);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching inventory items:", error);
    return { items: [], total: 0 };
  }

  return {
    items: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ================== LIVESTOCK FAMILY ACTIONS ==================

export async function createLivestockFamily(
  data: CreateLivestockFamilyData
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const validatedData = createLivestockFamilySchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { data: family, error } = await supabase
      .from("livestock_families")
      .insert({
        parent_id: validatedData.data.parentId,
        child_id: validatedData.data.childId,
        relationship_type: validatedData.data.relationshipType,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating livestock family:", error);
      return { success: false, error: "Failed to create family relationship" };
    }

    revalidatePath(`/inventory/livestock/${validatedData.data.parentId}`);
    revalidatePath(`/inventory/livestock/${validatedData.data.childId}`);
    return { success: true, data: { id: family.id } };
  } catch (error) {
    console.error("Error in createLivestockFamily:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteLivestockFamily(
  id: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("livestock_families")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting livestock family:", error);
      return { success: false, error: "Failed to delete family relationship" };
    }

    revalidatePath("/inventory/livestock");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteLivestockFamily:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLivestockFamilies(livestockId: string) {
  const supabase = await createClient();

  const { data: asParent } = await supabase
    .from("livestock_families")
    .select(
      `
      *,
      child:livestock!livestock_families_child_id_fkey(id, name, species, tag_number, status)
    `
    )
    .eq("parent_id", livestockId);

  const { data: asChild } = await supabase
    .from("livestock_families")
    .select(
      `
      *,
      parent:livestock!livestock_families_parent_id_fkey(id, name, species, tag_number, status)
    `
    )
    .eq("child_id", livestockId);

  return {
    offspring: asParent || [],
    parents: asChild || [],
  };
}

// ================== SUMMARY ACTIONS ==================

export async function getInventorySummary(farmId: string) {
  const supabase = await createClient();

  const [
    { count: livestockCount },
    { count: chickenFlockCount },
    { count: fieldCount },
    { count: inventoryItemCount },
  ] = await Promise.all([
    supabase
      .from("livestock")
      .select("*", { count: "exact", head: true })
      .eq("farm_id", farmId)
      .eq("status", "ACTIVE"),
    supabase
      .from("chicken_flocks")
      .select("*", { count: "exact", head: true })
      .eq("farm_id", farmId),
    supabase
      .from("fields")
      .select("*", { count: "exact", head: true })
      .eq("farm_id", farmId),
    supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true })
      .eq("farm_id", farmId),
  ]);

  // Get total chickens
  const { data: flocks } = await supabase
    .from("chicken_flocks")
    .select("count")
    .eq("farm_id", farmId);
  const totalChickens = flocks?.reduce((sum, f) => sum + f.count, 0) || 0;

  // Get recent egg count (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: eggLogs } = await supabase
    .from("egg_logs")
    .select(
      `
      eggs_collected,
      flock:chicken_flocks!inner(farm_id)
    `
    )
    .eq("flock.farm_id", farmId)
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);
  const recentEggs = eggLogs?.reduce((sum, l) => sum + l.eggs_collected, 0) || 0;

  // Get low stock items
  const { data: lowStockItems } = await supabase
    .from("inventory_items")
    .select("id, name, quantity")
    .eq("farm_id", farmId)
    .lte("quantity", 5)
    .limit(5);

  return {
    livestockCount: livestockCount || 0,
    chickenFlockCount: chickenFlockCount || 0,
    totalChickens,
    fieldCount: fieldCount || 0,
    inventoryItemCount: inventoryItemCount || 0,
    recentEggs,
    lowStockItems: lowStockItems || [],
  };
}
