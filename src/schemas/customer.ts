import { z } from "zod";

// US State options
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
] as const;

// Country options
export const COUNTRIES = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "Australia",
  "Other"
] as const;

// Customer form schema (for UI)
export const customerFormSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),
  email: z.string().email("Please enter a valid email").max(255).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[\+]?[\d\s\-\(\)\.]{10,}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  zipCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  taxNumber: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

// Schema for creating customer (server-side)
export const createCustomerSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateCustomerData = z.infer<typeof createCustomerSchema>;

// Schema for updating customer
export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
});

export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;

// Customer with invoice summary (for display)
export interface CustomerWithInvoices {
  id: string;
  farm_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  tax_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  invoices?: {
    id: string;
    invoice_number: string;
    date: string;
    status: string;
    total: number;
  }[];
  total_revenue?: number;
  invoice_count?: number;
}

// Filter schema for customer list
export const customerFilterSchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(["name", "email", "city", "created_at"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
});

export type CustomerFilterData = z.infer<typeof customerFilterSchema>;

// Default customer form values
export const defaultCustomerFormValues: CustomerFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  taxNumber: "",
  notes: "",
};

// Helper to format phone number
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Helper to convert form data to create data
export function customerFormToCreateData(
  formData: CustomerFormData,
  farmId: string
): CreateCustomerData {
  return {
    farmId,
    name: formData.name.trim(),
    email: formData.email?.trim() || null,
    phone: formData.phone ? formatPhoneNumber(formData.phone.trim()) : null,
    address: formData.address?.trim() || null,
    city: formData.city?.trim() || null,
    state: formData.state?.trim() || null,
    zipCode: formData.zipCode?.trim() || null,
    country: formData.country?.trim() || null,
    taxNumber: formData.taxNumber?.trim() || null,
    notes: formData.notes?.trim() || null,
  };
}
