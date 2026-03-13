"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseData,
  type UpdateExpenseData,
} from "@/schemas/expense";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Create a new expense
export async function createExpense(
  data: CreateExpenseData
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
    const validatedData = createExpenseSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { farmId, date, vendor, notes, grandTotal, receiptImageUrl, lineItems } =
      validatedData.data;

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        farm_id: farmId,
        user_id: user.id,
        date,
        vendor,
        notes,
        grand_total: grandTotal,
        receipt_image_url: receiptImageUrl,
      })
      .select("id")
      .single();

    if (expenseError) {
      console.error("Error creating expense:", expenseError);
      return { success: false, error: "Failed to create expense" };
    }

    // Create line items
    const lineItemsToInsert = lineItems.map((item) => ({
      expense_id: expense.id,
      item: item.item,
      category: item.category,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      line_total: item.lineTotal,
    }));

    const { error: lineItemsError } = await supabase
      .from("expense_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("Error creating line items:", lineItemsError);
      // Clean up the expense if line items failed
      await supabase.from("expenses").delete().eq("id", expense.id);
      return { success: false, error: "Failed to create line items" };
    }

    revalidatePath("/expenses");
    return { success: true, data: { id: expense.id } };
  } catch (error) {
    console.error("Error in createExpense:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update an existing expense
export async function updateExpense(
  data: UpdateExpenseData
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
    const validatedData = updateExpenseSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const { id, farmId, date, vendor, notes, grandTotal, receiptImageUrl, lineItems } =
      validatedData.data;

    // Verify the expense exists and belongs to the user's farm
    const { data: existingExpense, error: fetchError } = await supabase
      .from("expenses")
      .select("id, farm_id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingExpense) {
      return { success: false, error: "Expense not found" };
    }

    // Update expense
    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        date,
        vendor,
        notes,
        grand_total: grandTotal,
        receipt_image_url: receiptImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating expense:", updateError);
      return { success: false, error: "Failed to update expense" };
    }

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from("expense_line_items")
      .delete()
      .eq("expense_id", id);

    if (deleteError) {
      console.error("Error deleting line items:", deleteError);
      return { success: false, error: "Failed to update line items" };
    }

    // Create new line items
    const lineItemsToInsert = lineItems.map((item) => ({
      expense_id: id,
      item: item.item,
      category: item.category,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      line_total: item.lineTotal,
    }));

    const { error: lineItemsError } = await supabase
      .from("expense_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("Error creating line items:", lineItemsError);
      return { success: false, error: "Failed to update line items" };
    }

    revalidatePath("/expenses");
    revalidatePath(`/expenses/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateExpense:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Delete an expense
export async function deleteExpense(
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

    // Verify the expense exists and belongs to the user's farm
    const { data: existingExpense, error: fetchError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingExpense) {
      return { success: false, error: "Expense not found" };
    }

    // Delete line items first (foreign key constraint)
    const { error: lineItemsError } = await supabase
      .from("expense_line_items")
      .delete()
      .eq("expense_id", id);

    if (lineItemsError) {
      console.error("Error deleting line items:", lineItemsError);
      return { success: false, error: "Failed to delete expense" };
    }

    // Delete expense
    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting expense:", deleteError);
      return { success: false, error: "Failed to delete expense" };
    }

    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteExpense:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Upload receipt image to Supabase storage
export async function uploadReceiptImage(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
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

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)",
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File size must be less than 10MB" };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `receipts/${user.id}/${timestamp}.${fileExtension}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading receipt:", uploadError);
      return { success: false, error: "Failed to upload receipt image" };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(fileName);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error("Error in uploadReceiptImage:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Fetch expense by ID
export async function getExpenseById(id: string, farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      expense_line_items (*)
    `
    )
    .eq("id", id)
    .eq("farm_id", farmId)
    .single();

  if (error) {
    console.error("Error fetching expense:", error);
    return null;
  }

  return data;
}

// Fetch expenses for a farm with filters
export async function getExpenses(
  farmId: string,
  options: {
    startDate?: string;
    endDate?: string;
    category?: string;
    search?: string;
    sortBy?: "date" | "vendor" | "grand_total";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();

  const {
    startDate,
    endDate,
    category,
    search,
    sortBy = "date",
    sortOrder = "desc",
    page = 1,
    pageSize = 10,
  } = options;

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from("expenses")
    .select(
      `
      *,
      expense_line_items (*)
    `,
      { count: "exact" }
    )
    .eq("farm_id", farmId);

  // Apply filters
  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }
  if (search) {
    query = query.ilike("vendor", `%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching expenses:", error);
    return { expenses: [], total: 0 };
  }

  // Filter by category if specified (need to check line items)
  let filteredData = data || [];
  if (category && data) {
    filteredData = data.filter((expense) =>
      expense.expense_line_items?.some(
        (item: { category: string }) => item.category === category
      )
    );
  }

  return {
    expenses: filteredData,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}
