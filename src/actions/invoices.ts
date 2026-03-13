"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  type CreateInvoiceData,
  type UpdateInvoiceData,
  type InvoiceWithDetails,
  type InvoiceStatus,
} from "@/schemas/invoice";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// Create a new invoice
export async function createInvoice(
  data: CreateInvoiceData
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
    const validatedData = createInvoiceSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const {
      farmId,
      customerId,
      invoiceNumber,
      date,
      dueDate,
      status,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      notes,
      terms,
      items,
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

    // Verify customer exists
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("farm_id", farmId)
      .single();

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        farm_id: farmId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        date,
        due_date: dueDate,
        status,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        notes,
        terms,
      })
      .select("id")
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return { success: false, error: "Failed to create invoice" };
    }

    // Create invoice items
    const itemsToInsert = items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // Clean up the invoice if items failed
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return { success: false, error: "Failed to create invoice items" };
    }

    revalidatePath("/invoices");
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    console.error("Error in createInvoice:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update an existing invoice
export async function updateInvoice(
  data: UpdateInvoiceData
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
    const validatedData = updateInvoiceSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0]?.message || "Invalid data",
      };
    }

    const {
      id,
      farmId,
      customerId,
      invoiceNumber,
      date,
      dueDate,
      status,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
      notes,
      terms,
      items,
    } = validatedData.data;

    // Verify the invoice exists and belongs to the user's farm
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, farm_id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        customer_id: customerId,
        invoice_number: invoiceNumber,
        date,
        due_date: dueDate,
        status,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        notes,
        terms,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return { success: false, error: "Failed to update invoice" };
    }

    // Delete existing items
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (deleteError) {
      console.error("Error deleting invoice items:", deleteError);
      return { success: false, error: "Failed to update invoice items" };
    }

    // Create new items
    const itemsToInsert = items.map((item) => ({
      invoice_id: id,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      return { success: false, error: "Failed to update invoice items" };
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateInvoice:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Update invoice status only
export async function updateInvoiceStatus(
  id: string,
  farmId: string,
  status: InvoiceStatus
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

    // Verify the invoice exists and belongs to the user's farm
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Build update data
    const updateData: {
      status: InvoiceStatus;
      paid_date?: string | null;
      updated_at: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set paid_date if marking as paid
    if (status === "PAID") {
      updateData.paid_date = new Date().toISOString().split("T")[0];
    } else if ((existingInvoice.status as string) === "PAID") {
      // Clear paid_date if changing from paid to another status
      updateData.paid_date = null;
    }

    // Update invoice status
    const { error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating invoice status:", updateError);
      return { success: false, error: "Failed to update invoice status" };
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error("Error in updateInvoiceStatus:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Delete an invoice
export async function deleteInvoice(
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

    // Verify the invoice exists and belongs to the user's farm
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", id)
      .eq("farm_id", farmId)
      .single();

    if (fetchError || !existingInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Delete invoice items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", id);

    if (itemsError) {
      console.error("Error deleting invoice items:", itemsError);
      return { success: false, error: "Failed to delete invoice" };
    }

    // Delete invoice
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting invoice:", deleteError);
      return { success: false, error: "Failed to delete invoice" };
    }

    revalidatePath("/invoices");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteInvoice:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Generate unique invoice number
export async function generateInvoiceNumber(
  farmId: string,
  prefix: string = "INV"
): Promise<string> {
  const supabase = await createClient();

  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  // Get the count of invoices this month for this farm
  const startOfMonth = `${year}-${month}-01`;
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .gte("created_at", startOfMonth);

  const sequence = String((count || 0) + 1).padStart(4, "0");
  return `${prefix}-${year}${month}-${sequence}`;
}

// Fetch invoice by ID
export async function getInvoiceById(
  id: string,
  farmId: string
): Promise<InvoiceWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customer:customers (
        id,
        name,
        email,
        phone,
        address,
        city,
        state,
        zip_code,
        country,
        tax_number
      ),
      invoice_items (*)
    `
    )
    .eq("id", id)
    .eq("farm_id", farmId)
    .single();

  if (error) {
    console.error("Error fetching invoice:", error);
    return null;
  }

  return data as InvoiceWithDetails;
}

// Fetch invoices for a farm with filters
export async function getInvoices(
  farmId: string,
  options: {
    status?: InvoiceStatus;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: "date" | "due_date" | "invoice_number" | "total" | "status";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();

  const {
    status,
    customerId,
    startDate,
    endDate,
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
    .from("invoices")
    .select(
      `
      *,
      customer:customers (
        id,
        name,
        email
      )
    `,
      { count: "exact" }
    )
    .eq("farm_id", farmId);

  // Apply filters
  if (status) {
    query = query.eq("status", status);
  }
  if (customerId) {
    query = query.eq("customer_id", customerId);
  }
  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }
  if (search) {
    query = query.ilike("invoice_number", `%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching invoices:", error);
    return { invoices: [], total: 0 };
  }

  return {
    invoices: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Get invoice statistics for a farm
export async function getInvoiceStats(farmId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("status, total")
    .eq("farm_id", farmId);

  if (error) {
    console.error("Error fetching invoice stats:", error);
    return {
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      overdueAmount: 0,
      draftCount: 0,
      sentCount: 0,
      paidCount: 0,
      overdueCount: 0,
    };
  }

  const stats = {
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
    draftCount: 0,
    sentCount: 0,
    paidCount: 0,
    overdueCount: 0,
  };

  data?.forEach((invoice) => {
    stats.totalAmount += invoice.total;

    switch (invoice.status) {
      case "PAID":
        stats.paidAmount += invoice.total;
        stats.paidCount++;
        break;
      case "SENT":
        stats.unpaidAmount += invoice.total;
        stats.sentCount++;
        break;
      case "OVERDUE":
        stats.unpaidAmount += invoice.total;
        stats.overdueAmount += invoice.total;
        stats.overdueCount++;
        break;
      case "DRAFT":
        stats.draftCount++;
        break;
    }
  });

  return stats;
}

// Get invoices for a specific customer
export async function getInvoicesByCustomer(
  customerId: string,
  farmId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("customer_id", customerId)
    .eq("farm_id", farmId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching customer invoices:", error);
    return [];
  }

  return data || [];
}
