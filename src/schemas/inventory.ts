import { z } from "zod";

// Species options for livestock
export const SPECIES_OPTIONS = [
  "Cow",
  "Pig",
  "Goat",
  "Sheep",
  "Horse",
  "Donkey",
  "Llama",
  "Alpaca",
  "Other",
] as const;

export type Species = (typeof SPECIES_OPTIONS)[number];

// Livestock gender options (matching database enum)
export const LIVESTOCK_GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;
export type LivestockGender = (typeof LIVESTOCK_GENDERS)[number];

// Livestock status options (matching database enum)
export const LIVESTOCK_STATUSES = [
  "ACTIVE",
  "SOLD",
  "DECEASED",
  "TRANSFERRED",
  "QUARANTINED",
] as const;
export type LivestockStatus = (typeof LIVESTOCK_STATUSES)[number];

// Medical record types (matching database enum)
export const MEDICAL_RECORD_TYPES = [
  "VACCINATION",
  "TREATMENT",
  "CHECKUP",
  "SURGERY",
  "MEDICATION",
  "OTHER",
] as const;
export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

// Field types (matching database enum)
export const FIELD_TYPES = [
  "PASTURE",
  "CROP",
  "ORCHARD",
  "GREENHOUSE",
  "BARN",
  "STORAGE",
  "OTHER",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// Inventory item types (matching database enum)
export const INVENTORY_ITEM_TYPES = [
  "FEED",
  "SEED",
  "FERTILIZER",
  "PESTICIDE",
  "EQUIPMENT",
  "TOOL",
  "SUPPLY",
  "OTHER",
] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

// Livestock relationship types
export const RELATIONSHIP_TYPES = ["PARENT", "OFFSPRING", "SIBLING"] as const;
export type LivestockRelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// ================== LIVESTOCK SCHEMA ==================
export const livestockFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  species: z.string().min(1, "Species is required"),
  breed: z.string().max(100, "Breed is too long").optional().nullable(),
  tagNumber: z.string().max(50, "Tag number is too long").optional().nullable(),
  birthDate: z.date().optional().nullable(),
  weight: z
    .number()
    .min(0, "Weight must be positive")
    .optional()
    .nullable(),
  gender: z.enum(LIVESTOCK_GENDERS).optional().nullable(),
  status: z.enum(LIVESTOCK_STATUSES),
  fieldId: z.string().uuid().optional().nullable(),
  acquisitionDate: z.date().optional().nullable(),
  acquisitionCost: z
    .number()
    .min(0, "Cost must be positive")
    .optional()
    .nullable(),
  notes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

export type LivestockFormData = z.infer<typeof livestockFormSchema>;

// Server-side create schema
export const createLivestockSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1).max(100),
  species: z.string().min(1),
  breed: z.string().max(100).optional().nullable(),
  tagNumber: z.string().max(50).optional().nullable(),
  birthDate: z.string().optional().nullable(), // ISO date string
  weight: z.number().min(0).optional().nullable(),
  gender: z.enum(LIVESTOCK_GENDERS).optional().nullable(),
  status: z.enum(LIVESTOCK_STATUSES).default("ACTIVE"),
  fieldId: z.string().uuid().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(), // ISO date string
  acquisitionCost: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateLivestockData = z.infer<typeof createLivestockSchema>;

export const updateLivestockSchema = createLivestockSchema.extend({
  id: z.string().uuid(),
});

export type UpdateLivestockData = z.infer<typeof updateLivestockSchema>;

// ================== MEDICAL RECORD SCHEMA ==================
export const medicalRecordFormSchema = z.object({
  type: z.enum(MEDICAL_RECORD_TYPES, {
    message: "Record type is required",
  }),
  date: z.date({
    message: "Date is required",
  }),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  medicine: z.string().max(200, "Medicine name is too long").optional().nullable(),
  dosage: z.string().max(100, "Dosage is too long").optional().nullable(),
  administeredBy: z.string().max(100, "Name is too long").optional().nullable(),
  followUpDate: z.date().optional().nullable(),
  notes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

export type MedicalRecordFormData = z.infer<typeof medicalRecordFormSchema>;

export const createMedicalRecordSchema = z.object({
  livestockId: z.string().uuid(),
  type: z.enum(MEDICAL_RECORD_TYPES),
  date: z.string(), // ISO date string
  description: z.string().max(500).optional().nullable(),
  medicine: z.string().max(200).optional().nullable(),
  dosage: z.string().max(100).optional().nullable(),
  administeredBy: z.string().max(100).optional().nullable(),
  followUpDate: z.string().optional().nullable(), // ISO date string
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateMedicalRecordData = z.infer<typeof createMedicalRecordSchema>;

export const updateMedicalRecordSchema = createMedicalRecordSchema.extend({
  id: z.string().uuid(),
});

export type UpdateMedicalRecordData = z.infer<typeof updateMedicalRecordSchema>;

// ================== CHICKEN FLOCK SCHEMA ==================
export const chickenFlockFormSchema = z.object({
  breed: z.string().min(1, "Breed is required").max(100, "Breed is too long"),
  count: z
    .number({
      message: "Count must be a number",
    })
    .min(1, "Count must be at least 1"),
  hasRooster: z.boolean(),
  coopLocation: z.string().max(200, "Location is too long").optional().nullable(),
  notes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

export type ChickenFlockFormData = z.infer<typeof chickenFlockFormSchema>;

export const createChickenFlockSchema = z.object({
  farmId: z.string().uuid(),
  breed: z.string().min(1).max(100),
  count: z.number().min(1),
  hasRooster: z.boolean().default(false),
  coopLocation: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateChickenFlockData = z.infer<typeof createChickenFlockSchema>;

export const updateChickenFlockSchema = createChickenFlockSchema.extend({
  id: z.string().uuid(),
});

export type UpdateChickenFlockData = z.infer<typeof updateChickenFlockSchema>;

// ================== EGG LOG SCHEMA ==================
export const eggLogFormSchema = z.object({
  flockId: z.string().uuid({
    message: "Please select a flock",
  }),
  date: z.date({
    message: "Date is required",
  }),
  eggsCollected: z
    .number({
      message: "Number of eggs must be a number",
    })
    .min(0, "Cannot be negative"),
  notes: z.string().max(500, "Notes are too long").optional().nullable(),
});

export type EggLogFormData = z.infer<typeof eggLogFormSchema>;

export const createEggLogSchema = z.object({
  flockId: z.string().uuid(),
  date: z.string(), // ISO date string
  eggsCollected: z.number().min(0),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateEggLogData = z.infer<typeof createEggLogSchema>;

// ================== FIELD SCHEMA ==================
export const fieldFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  acres: z
    .number()
    .min(0, "Acres must be positive")
    .optional()
    .nullable(),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  fieldType: z.enum(FIELD_TYPES).optional().nullable(),
  notes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

export type FieldFormData = z.infer<typeof fieldFormSchema>;

export const createFieldSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1).max(100),
  acres: z.number().min(0).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  fieldType: z.enum(FIELD_TYPES).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateFieldData = z.infer<typeof createFieldSchema>;

export const updateFieldSchema = createFieldSchema.extend({
  id: z.string().uuid(),
});

export type UpdateFieldData = z.infer<typeof updateFieldSchema>;

// ================== INVENTORY ITEM SCHEMA ==================
export const inventoryItemFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name is too long"),
  type: z.enum(INVENTORY_ITEM_TYPES, {
    message: "Type is required",
  }),
  quantity: z
    .number({
      message: "Quantity must be a number",
    })
    .min(0, "Quantity cannot be negative"),
  unit: z.string().max(50, "Unit is too long").optional().nullable(),
  location: z.string().max(200, "Location is too long").optional().nullable(),
  acquiredDate: z.date().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  cost: z
    .number()
    .min(0, "Cost must be positive")
    .optional()
    .nullable(),
  notes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

export type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

export const createInventoryItemSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: z.enum(INVENTORY_ITEM_TYPES),
  quantity: z.number().min(0),
  unit: z.string().max(50).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  acquiredDate: z.string().optional().nullable(), // ISO date string
  expiryDate: z.string().optional().nullable(), // ISO date string
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateInventoryItemData = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.extend({
  id: z.string().uuid(),
});

export type UpdateInventoryItemData = z.infer<typeof updateInventoryItemSchema>;

// ================== LIVESTOCK FAMILY SCHEMA ==================
export const createLivestockFamilySchema = z.object({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
});

export type CreateLivestockFamilyData = z.infer<typeof createLivestockFamilySchema>;

// ================== HELPER FUNCTIONS ==================

// Convert form data to create data for livestock
export function livestockFormToCreateData(
  formData: LivestockFormData,
  farmId: string
): Omit<CreateLivestockData, "farmId"> & { farmId: string } {
  return {
    farmId,
    name: formData.name,
    species: formData.species,
    breed: formData.breed,
    tagNumber: formData.tagNumber,
    birthDate: formData.birthDate?.toISOString().split("T")[0] || null,
    weight: formData.weight,
    gender: formData.gender,
    status: formData.status,
    fieldId: formData.fieldId,
    acquisitionDate: formData.acquisitionDate?.toISOString().split("T")[0] || null,
    acquisitionCost: formData.acquisitionCost,
    notes: formData.notes,
  };
}

// Convert form data to create data for medical record
export function medicalRecordFormToCreateData(
  formData: MedicalRecordFormData,
  livestockId: string
): CreateMedicalRecordData {
  return {
    livestockId,
    type: formData.type,
    date: formData.date.toISOString().split("T")[0],
    description: formData.description,
    medicine: formData.medicine,
    dosage: formData.dosage,
    administeredBy: formData.administeredBy,
    followUpDate: formData.followUpDate?.toISOString().split("T")[0] || null,
    notes: formData.notes,
  };
}

// Convert form data to create data for chicken flock
export function chickenFlockFormToCreateData(
  formData: ChickenFlockFormData,
  farmId: string
): CreateChickenFlockData {
  return {
    farmId,
    breed: formData.breed,
    count: formData.count,
    hasRooster: formData.hasRooster,
    coopLocation: formData.coopLocation,
    notes: formData.notes,
  };
}

// Convert form data to create data for egg log
export function eggLogFormToCreateData(
  formData: EggLogFormData
): CreateEggLogData {
  return {
    flockId: formData.flockId,
    date: formData.date.toISOString().split("T")[0],
    eggsCollected: formData.eggsCollected,
    notes: formData.notes,
  };
}

// Convert form data to create data for field
export function fieldFormToCreateData(
  formData: FieldFormData,
  farmId: string
): CreateFieldData {
  return {
    farmId,
    name: formData.name,
    acres: formData.acres,
    description: formData.description,
    fieldType: formData.fieldType,
    notes: formData.notes,
  };
}

// Convert form data to create data for inventory item
export function inventoryItemFormToCreateData(
  formData: InventoryItemFormData,
  farmId: string
): CreateInventoryItemData {
  return {
    farmId,
    name: formData.name,
    type: formData.type,
    quantity: formData.quantity,
    unit: formData.unit,
    location: formData.location,
    acquiredDate: formData.acquiredDate?.toISOString().split("T")[0] || null,
    expiryDate: formData.expiryDate?.toISOString().split("T")[0] || null,
    cost: formData.cost,
    notes: formData.notes,
  };
}

// Default values for forms
export const defaultLivestockFormValues: LivestockFormData = {
  name: "",
  species: "",
  breed: "",
  tagNumber: "",
  birthDate: null,
  weight: null,
  gender: null,
  status: "ACTIVE",
  fieldId: null,
  acquisitionDate: null,
  acquisitionCost: null,
  notes: "",
};

export const defaultMedicalRecordFormValues: MedicalRecordFormData = {
  type: "CHECKUP",
  date: new Date(),
  description: "",
  medicine: "",
  dosage: "",
  administeredBy: "",
  followUpDate: null,
  notes: "",
};

export const defaultChickenFlockFormValues: ChickenFlockFormData = {
  breed: "",
  count: 1,
  hasRooster: false,
  coopLocation: "",
  notes: "",
};

export const defaultEggLogFormValues: Partial<EggLogFormData> = {
  date: new Date(),
  eggsCollected: 0,
  notes: "",
};

export const defaultFieldFormValues: FieldFormData = {
  name: "",
  acres: null,
  description: "",
  fieldType: null,
  notes: "",
};

export const defaultInventoryItemFormValues: InventoryItemFormData = {
  name: "",
  type: "SUPPLY",
  quantity: 0,
  unit: "",
  location: "",
  acquiredDate: null,
  expiryDate: null,
  cost: null,
  notes: "",
};
