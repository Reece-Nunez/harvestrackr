import { z } from "zod";

// Invoice status enum
export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// Invoice item categories (similar to expense categories but for selling)
export const INVOICE_CATEGORIES = [
  "Eggs",
  "Beef",
  "Pork",
  "Poultry",
  "Dairy",
  "Produce",
  "Grains",
  "Hay",
  "Livestock",
  "Seeds",
  "Services",
  "Equipment Rental",
  "Other",
] as const;

export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

// Unit types for invoice items
export const INVOICE_UNITS = [
  "each",
  "dozen",
  "lb",
  "oz",
  "kg",
  "ton",
  "gallon",
  "liter",
  "bushel",
  "bale",
  "head",
  "hour",
  "day",
  "acre",
] as const;

export type InvoiceUnit = (typeof INVOICE_UNITS)[number];

// Invoice item form schema
export const invoiceItemFormSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().max(100).optional().or(z.literal("")),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Quantity must be greater than 0",
    }),
  unit: z.string().optional().or(z.literal("")),
  unitPrice: z
    .string()
    .min(1, "Unit price is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Unit price must be 0 or greater",
    }),
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemFormSchema>;

// Main invoice form schema (for UI)
export const invoiceFormSchema = z.object({
  customerId: z.string().uuid("Please select a customer"),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(50),
  date: z.date({
    message: "Invoice date is required",
  }),
  dueDate: z.date({
    message: "Due date is required",
  }),
  status: z.enum(INVOICE_STATUSES).default("DRAFT"),
  items: z.array(invoiceItemFormSchema).min(1, "At least one item is required"),
  taxRate: z
    .string()
    .refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), {
      message: "Tax rate must be between 0 and 100",
    })
    .optional()
    .or(z.literal("")),
  discountAmount: z
    .string()
    .refine((val) => val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: "Discount must be 0 or greater",
    })
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  terms: z.string().max(2000).optional().or(z.literal("")),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// Schema for creating invoice (server-side)
export const createInvoiceSchema = z.object({
  farmId: z.string().uuid(),
  customerId: z.string().uuid(),
  invoiceNumber: z.string().min(1).max(50),
  date: z.string(), // ISO date string
  dueDate: z.string(), // ISO date string
  status: z.enum(INVOICE_STATUSES).default("DRAFT"),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  taxAmount: z.number().min(0).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  total: z.number().min(0),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(2000).optional().nullable(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(500),
      category: z.string().max(100).optional().nullable(),
      quantity: z.number().min(0),
      unit: z.string().max(50).optional().nullable(),
      unitPrice: z.number().min(0),
      total: z.number().min(0),
    })
  ),
});

export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;

// Schema for updating invoice
export const updateInvoiceSchema = createInvoiceSchema.extend({
  id: z.string().uuid(),
});

export type UpdateInvoiceData = z.infer<typeof updateInvoiceSchema>;

// Invoice with items and customer (for display)
export interface InvoiceWithDetails {
  id: string;
  farm_id: string;
  customer_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total: number;
  notes: string | null;
  terms: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
    tax_number: string | null;
  };
  invoice_items: {
    id: string;
    invoice_id: string;
    description: string;
    category: string | null;
    quantity: number;
    unit: string | null;
    unit_price: number;
    total: number;
    created_at: string;
  }[];
}

// Filter schema for invoice list
export const invoiceFilterSchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["date", "due_date", "invoice_number", "total", "status"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export type InvoiceFilterData = z.infer<typeof invoiceFilterSchema>;

// Default invoice item for form
export const defaultInvoiceItem: InvoiceItemFormData = {
  description: "",
  category: "",
  quantity: "1",
  unit: "each",
  unitPrice: "",
};

// Default invoice form values
export const defaultInvoiceFormValues: Omit<InvoiceFormData, "customerId"> & { customerId: string } = {
  customerId: "",
  invoiceNumber: "",
  date: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  status: "DRAFT",
  items: [defaultInvoiceItem],
  taxRate: "",
  discountAmount: "",
  notes: "",
  terms: "Payment due within 30 days",
};

// Helper function to calculate line total
export function calculateInvoiceLineTotal(quantity: string, unitPrice: string): number {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return qty * price;
}

// Helper function to calculate invoice totals
export function calculateInvoiceTotals(
  items: Array<{ quantity: string; unitPrice: string }>,
  taxRate: string,
  discountAmount: string
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateInvoiceLineTotal(item.quantity, item.unitPrice);
  }, 0);

  const rate = parseFloat(taxRate) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount - discount;

  return { subtotal, taxAmount, total: Math.max(0, total) };
}

// Helper to generate invoice number
export function generateInvoiceNumber(prefix: string = "INV"): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${year}${month}${day}-${random}`;
}

// Helper to convert form data to create data
export function invoiceFormToCreateData(
  formData: InvoiceFormData,
  farmId: string
): CreateInvoiceData {
  const items = formData.items.map((item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return {
      description: item.description,
      category: item.category || null,
      quantity,
      unit: item.unit || null,
      unitPrice,
      total: quantity * unitPrice,
    };
  });

  const { subtotal, taxAmount, total } = calculateInvoiceTotals(
    formData.items,
    formData.taxRate || "",
    formData.discountAmount || ""
  );

  return {
    farmId,
    customerId: formData.customerId,
    invoiceNumber: formData.invoiceNumber,
    date: formData.date.toISOString().split("T")[0],
    dueDate: formData.dueDate.toISOString().split("T")[0],
    status: formData.status,
    subtotal,
    taxRate: parseFloat(formData.taxRate || "0") || null,
    taxAmount: taxAmount || null,
    discountAmount: parseFloat(formData.discountAmount || "0") || null,
    total,
    notes: formData.notes || null,
    terms: formData.terms || null,
    items,
  };
}

// Status badge colors
export function getInvoiceStatusVariant(
  status: InvoiceStatus
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "PAID":
      return "success";
    case "SENT":
      return "default";
    case "OVERDUE":
      return "destructive";
    case "CANCELLED":
      return "secondary";
    case "DRAFT":
    default:
      return "warning";
  }
}

// Check if invoice is overdue
export function isInvoiceOverdue(invoice: { due_date: string; status: InvoiceStatus }): boolean {
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return false;
  }
  return new Date(invoice.due_date) < new Date();
}
