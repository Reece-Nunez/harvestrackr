"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseExpenseRow,
  parseIncomeRow,
  groupExpensesByVendorDate,
} from "@/lib/csv-service";
import type { PaymentMethod } from "@/types/database";

// Result type for actions
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Import expenses from transformed CSV data
 */
export async function importExpenses(
  farmId: string,
  data: Record<string, unknown>[]
): Promise<ActionResult<{ imported: number }>> {
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

    // Parse and group expense data
    const parsedRows = data.map((row) => parseExpenseRow(row));
    const grouped = groupExpensesByVendorDate(parsedRows);

    let importedCount = 0;

    // Create expenses with line items
    for (const [, lineItems] of grouped) {
      if (lineItems.length === 0) continue;

      const firstItem = lineItems[0];
      const grandTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

      // Create expense
      const description = lineItems.map((i) => i.item).join(", ") || `Purchase from ${firstItem.vendor}`;
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          farm_id: farmId,
          user_id: user.id,
          date: firstItem.date,
          vendor: firstItem.vendor,
          description,
          notes: firstItem.notes || null,
          grand_total: grandTotal,
        })
        .select("id")
        .single();

      if (expenseError) {
        console.error("Error creating expense:", expenseError);
        continue;
      }

      // Create line items
      // Note: line_total is GENERATED ALWAYS in the DB (quantity * unit_price) — do not insert it
      const lineItemsToInsert = lineItems.map((item) => ({
        expense_id: expense.id,
        description: item.item,
        item: item.item,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unitCost,
        unit_cost: item.unitCost,
      }));

      const { error: lineItemsError } = await supabase
        .from("expense_line_items")
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        console.error("Error creating line items:", lineItemsError);
        // Clean up the expense if line items failed
        await supabase.from("expenses").delete().eq("id", expense.id);
        continue;
      }

      importedCount++;
    }

    revalidatePath("/expenses");
    revalidatePath("/import");

    return { success: true, data: { imported: importedCount } };
  } catch (error) {
    console.error("Error in importExpenses:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Map string payment method to PaymentMethod enum
function mapPaymentMethod(method: string): PaymentMethod | null {
  const methodMap: Record<string, PaymentMethod> = {
    cash: "CASH",
    check: "CHECK",
    credit_card: "CREDIT_CARD",
    "credit card": "CREDIT_CARD",
    creditcard: "CREDIT_CARD",
    debit_card: "DEBIT_CARD",
    "debit card": "DEBIT_CARD",
    debitcard: "DEBIT_CARD",
    bank_transfer: "BANK_TRANSFER",
    "bank transfer": "BANK_TRANSFER",
    banktransfer: "BANK_TRANSFER",
    wire: "BANK_TRANSFER",
    online: "ONLINE",
    paypal: "ONLINE",
    venmo: "ONLINE",
    other: "OTHER",
  };

  const normalized = method.toLowerCase().trim();
  return methodMap[normalized] || null;
}

/**
 * Import income from transformed CSV data
 */
export async function importIncome(
  farmId: string,
  data: Record<string, unknown>[]
): Promise<ActionResult<{ imported: number }>> {
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

    let importedCount = 0;

    // Create income records
    for (const row of data) {
      const parsed = parseIncomeRow(row);
      const paymentMethod = parsed.paymentMethod
        ? mapPaymentMethod(parsed.paymentMethod)
        : null;

      const { error: incomeError } = await supabase.from("income").insert({
        farm_id: farmId,
        user_id: user.id,
        date: parsed.date,
        item: parsed.item,
        quantity: parsed.quantity,
        price: parsed.price,
        amount: parsed.amount,
        payment_method: paymentMethod,
        notes: parsed.notes || null,
      });

      if (incomeError) {
        console.error("Error creating income:", incomeError);
        continue;
      }

      importedCount++;
    }

    revalidatePath("/income");
    revalidatePath("/import");

    return { success: true, data: { imported: importedCount } };
  } catch (error) {
    console.error("Error in importIncome:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Log an import to the import history
 */
export async function logImport(
  farmId: string,
  type: "expenses" | "income",
  filename: string,
  totalRows: number,
  successfulRows: number,
  failedRows: number
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

    const status =
      failedRows === 0
        ? "completed"
        : successfulRows === 0
          ? "failed"
          : "partial";

    const { data, error } = await supabase
      .from("import_history")
      .insert({
        farm_id: farmId,
        user_id: user.id,
        import_type: type,
        filename,
        total_rows: totalRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        status,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error logging import:", error);
      return { success: false, error: "Failed to log import" };
    }

    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error("Error in logImport:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get import history for a farm
 */
export async function getImportHistory(
  farmId: string,
  options: {
    page?: number;
    pageSize?: number;
    type?: "expenses" | "income";
  } = {}
) {
  try {
    const supabase = await createClient();

    const { page = 1, pageSize = 10, type } = options;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("import_history")
      .select("*", { count: "exact" })
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("import_type", type);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching import history:", error);
      return { imports: [], total: 0, page, pageSize, totalPages: 0 };
    }

    return {
      imports: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error("Error in getImportHistory:", error);
    return { imports: [], total: 0, page: options.page || 1, pageSize: options.pageSize || 10, totalPages: 0 };
  }
}
