import { z } from "zod";

// Item types from original IncomeForm
export const ITEM_TYPES = ["Eggs", "Beef", "Pork", "Animal", "Other"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

// Payment methods from original IncomeForm (matched with database PaymentMethod enum)
export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Checks" },
  { value: "ONLINE", label: "Venmo" },
  { value: "OTHER", label: "Other" },
] as const;

export const PAYMENT_METHOD_VALUES = ["CASH", "CHECK", "ONLINE", "OTHER"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHOD_VALUES)[number];

export const incomeSchema = z.object({
  date: z
    .date({
      message: "Date is required",
    }),
  item: z
    .enum(ITEM_TYPES, {
      message: "Please select an item type",
    }),
  quantity: z
    .number({
      message: "Quantity must be a number",
    })
    .min(0.01, "Quantity must be greater than 0"),
  price: z
    .number({
      message: "Price must be a number",
    })
    .min(0, "Price cannot be negative"),
  amount: z
    .number({
      message: "Amount must be a number",
    })
    .min(0, "Amount cannot be negative"),
  paymentMethod: z
    .enum(PAYMENT_METHOD_VALUES, {
      message: "Please select a payment method",
    })
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .nullable(),
  livestockId: z
    .string()
    .uuid("Invalid livestock ID")
    .optional()
    .nullable(),
});

export type IncomeFormData = z.infer<typeof incomeSchema>;

// Schema for filtering income records
export const incomeFilterSchema = z.object({
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  item: z.enum(ITEM_TYPES).optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).optional().nullable(),
});

export type IncomeFilterData = z.infer<typeof incomeFilterSchema>;
