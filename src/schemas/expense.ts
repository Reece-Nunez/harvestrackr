import { z } from "zod";

// Expense categories matching the original app
export const EXPENSE_CATEGORIES = [
  "Chemicals",
  "Conservation Expenses",
  "Custom Hire",
  "Feed Purchased",
  "Fertilizers and Lime",
  "Freight and Trucking",
  "Gasoline, Fuel, and Oil",
  "Mortgage Interest",
  "Insurance (Not Health)",
  "Other Interest",
  "Equipment Rental",
  "Farm Equipment",
  "Other Rental",
  "Repairs and Maintenance",
  "Seeds and Plants",
  "Storage and Warehousing",
  "Supplies Purchased",
  "Taxes",
  "Utilities",
  "Vet",
  "Breeding",
  "Medicine",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Line item schema for individual expense items
export const lineItemSchema = z.object({
  id: z.string().optional(),
  item: z.string().min(1, "Item name is required"),
  category: z.enum(EXPENSE_CATEGORIES, {
    message: "Please select a category",
  }),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Quantity must be greater than 0",
    }),
  unitCost: z
    .string()
    .min(1, "Unit cost is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Unit cost must be 0 or greater",
    }),
});

export type LineItemFormData = z.infer<typeof lineItemSchema>;

// Main expense form schema
export const expenseFormSchema = z.object({
  date: z.date({
    message: "Date is required",
  }),
  vendor: z.string().min(1, "Vendor/Supplier is required"),
  notes: z.string().optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
  receiptImage: z.instanceof(File).optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

// Schema for creating expense (server-side)
export const createExpenseSchema = z.object({
  farmId: z.string().uuid(),
  date: z.string(), // ISO date string
  vendor: z.string().min(1),
  notes: z.string().optional(),
  grandTotal: z.number().min(0),
  receiptImageUrl: z.string().url().optional().nullable(),
  lineItems: z.array(
    z.object({
      item: z.string().min(1),
      category: z.enum(EXPENSE_CATEGORIES),
      quantity: z.number().min(0),
      unitCost: z.number().min(0),
      lineTotal: z.number().min(0),
    })
  ),
});

export type CreateExpenseData = z.infer<typeof createExpenseSchema>;

// Schema for updating expense
export const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string().uuid(),
});

export type UpdateExpenseData = z.infer<typeof updateExpenseSchema>;

// Expense with line items (for display)
export interface ExpenseWithLineItems {
  id: string;
  farm_id: string;
  user_id: string;
  date: string;
  vendor: string | null;
  description: string | null;
  grand_total: number;
  receipt_image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expense_line_items: {
    id: string;
    expense_id: string;
    item: string;
    category: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    created_at: string;
  }[];
}

// Filter schema for expense list
export const expenseFilterSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["date", "vendor", "grand_total"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export type ExpenseFilterData = z.infer<typeof expenseFilterSchema>;

// Default line item for form
export const defaultLineItem: LineItemFormData = {
  item: "",
  category: "Supplies Purchased",
  quantity: "",
  unitCost: "",
};

// Default expense form values
export const defaultExpenseFormValues: ExpenseFormData = {
  date: new Date(),
  vendor: "",
  notes: "",
  lineItems: [defaultLineItem],
  receiptImage: null,
};

// Helper function to calculate line total
export function calculateLineTotal(quantity: string, unitCost: string): number {
  const qty = parseFloat(quantity) || 0;
  const cost = parseFloat(unitCost) || 0;
  return qty * cost;
}

// Helper function to calculate grand total from line items
export function calculateGrandTotal(
  lineItems: Array<{ quantity: string; unitCost: string }>
): number {
  return lineItems.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.unitCost);
  }, 0);
}

// Helper to convert form data to create data
export function formDataToCreateData(
  formData: ExpenseFormData,
  farmId: string,
  receiptImageUrl?: string | null
): Omit<CreateExpenseData, "farmId"> & { farmId: string } {
  const lineItems = formData.lineItems.map((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitCost = parseFloat(item.unitCost) || 0;
    return {
      item: item.item,
      category: item.category,
      quantity,
      unitCost,
      lineTotal: quantity * unitCost,
    };
  });

  const grandTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    farmId,
    date: formData.date.toISOString().split("T")[0],
    vendor: formData.vendor,
    notes: formData.notes || undefined,
    grandTotal,
    receiptImageUrl: receiptImageUrl || null,
    lineItems,
  };
}
