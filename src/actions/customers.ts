"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerData,
  type UpdateCustomerData,
  type CustomerWithInvoices,
} from "@/schemas/customer";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Create a new customer
export async function createCustomer(
  data: CreateCustomerData
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
    const validatedData = createCustomerSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const {
      farmId,
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      taxNumber,
      notes,
    } = validatedData.data;

    // Verify user has access to the farm
    const { data: farmAccess } = await supabase
      .from("farms")
      .select("id")
      .eq("id", farmId)
      .eq("owner_id", user.id)
      .single();

    if (!farmAccess) {
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

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        farm_id: farmId,
        name,
        email,
        phone,
        address,
        city,
        state,
        zip_code: zipCode,
        country,
        tax_number: taxNumber,
        notes,
      })
      .select("id")
      .single();

    if (customerError) {
      console.error("Error creating customer:", customerError);
      return { success: false, error: "Failed to create customer" };
    }

    revalidatePath("/customers");
    return { success: true, data: { id: customer.id } };
  } catch (error) {
    console.error("Error in createCustomer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update an existing customer
export async function updateCustomer(
  data: UpdateCustomerData
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
    const validatedData = updateCustomerSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const {
      id,
      farmId,
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      taxNumber,
      notes,
    } = validatedData.data;

    // Verify the customer exists and belongs to the user's farm
    const { data: existingCustomer, error: fetchError } = await supabase
      .from("customers")
      .select("id, farm_id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingCustomer) {
      return { success: false, error: "Customer not found" };
    }

    // Update customer
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name,
        email,
        phone,
        address,
        city,
        state,
        zip_code: zipCode,
        country,
        tax_number: taxNumber,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating customer:", updateError);
      return { success: false, error: "Failed to update customer" };
    }

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Delete a customer
export async function deleteCustomer(
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

    // Verify the customer exists and belongs to the user's farm
    const { data: existingCustomer, error: fetchError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingCustomer) {
      return { success: false, error: "Customer not found" };
    }

    // Check for associated invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id")
      .eq("customer_id", id)
      .limit(1);

    if (invoices && invoices.length > 0) {
      return {
        success: false,
        error: "Cannot delete customer with existing invoices. Please delete the invoices first.",
      };
    }

    // Delete customer
    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting customer:", deleteError);
      return { success: false, error: "Failed to delete customer" };
    }

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Fetch customer by ID
export async function getCustomerById(
  id: string,
  farmId: string
): Promise<CustomerWithInvoices | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      invoices (
        id,
        invoice_number,
        date,
        status,
        total
      )
    `
    )
    .eq("id", id)
    .eq("farm_id", farmId)
    .single();

  if (error) {
    console.error("Error fetching customer:", error);
    return null;
  }

  // Calculate total revenue
  const totalRevenue =
    data.invoices
      ?.filter((inv: { status: string }) => inv.status === "PAID")
      .reduce((sum: number, inv: { total: number }) => sum + inv.total, 0) || 0;

  return {
    ...data,
    total_revenue: totalRevenue,
    invoice_count: data.invoices?.length || 0,
  };
}

// Fetch customers for a farm with filters
export async function getCustomers(
  farmId: string,
  options: {
    search?: string;
    sortBy?: "name" | "email" | "city" | "created_at";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();

  const {
    search,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 10,
  } = options;

  // Calculate offset
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("farm_id", farmId);

  // Apply search filter
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching customers:", error);
    return { customers: [], total: 0 };
  }

  return {
    customers: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Get all customers for dropdown (minimal data)
export async function getCustomersForDropdown(farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("farm_id", farmId)
    .order("name");

  if (error) {
    console.error("Error fetching customers for dropdown:", error);
    return [];
  }

  return data || [];
}
