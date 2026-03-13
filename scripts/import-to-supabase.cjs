/**
 * Supabase Import Script for HarvesTrackr Migration
 * Updated to match initial_schema.sql structure
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, "../dynamodb-export");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials!");
  console.error("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Mapping from DynamoDB IDs to new Supabase UUIDs
const idMappings = {
  users: {},
  farms: {},
  expenses: {},
  livestock: {},
  customers: {},
  invoices: {},
  chickenFlocks: {},
};

// Helper to generate UUID
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Read JSON file
function readExportFile(filename) {
  const filepath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  File not found: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(content);
}

// Transform farm data
function transformFarm(dynamo) {
  const newId = generateUUID();
  idMappings.farms[dynamo.id] = newId;

  return {
    id: newId,
    name: dynamo.name || "My Farm",
    type: dynamo.farmType || "MIXED",
    description: dynamo.description || null,
    address: dynamo.address || null,
    city: dynamo.city || null,
    state: dynamo.state || null,
    zip_code: dynamo.zipCode || null,
    country: dynamo.country || "USA",
    acreage: dynamo.acres || null,
    settings: {},
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform livestock data
function transformLivestock(dynamo, farmId) {
  const newId = generateUUID();
  idMappings.livestock[dynamo.id] = newId;

  return {
    id: newId,
    farm_id: farmId,
    tag_number: dynamo.id.substring(0, 20), // Use part of old ID as tag
    name: dynamo.name || "Unnamed",
    species: dynamo.species || "Unknown",
    breed: dynamo.breed || null,
    gender: (dynamo.gender || "UNKNOWN").toUpperCase(),
    birth_date: dynamo.birthdate || null,
    status: (dynamo.status || "ACTIVE").toUpperCase(),
    weight: dynamo.weight || null,
    location: dynamo.fieldID || null, // Store field reference as location text
    notes: dynamo.notes || null,
    metadata: {},
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform expense data - matches initial_schema expenses table
function transformExpense(dynamo, farmId, profileId) {
  const newId = generateUUID();
  idMappings.expenses[dynamo.id] = newId;

  return {
    id: newId,
    farm_id: farmId,
    created_by: profileId,
    date: dynamo.date,
    description: dynamo.vendor || "Expense",
    grand_total: dynamo.grandTotal || 0,
    receipt_url: null, // Will need to migrate S3 images separately
    notes: dynamo.description || null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform line item data - matches initial_schema expense_line_items table
function transformLineItem(dynamo) {
  const expenseId = idMappings.expenses[dynamo.expenseID];
  if (!expenseId) return null;

  return {
    id: generateUUID(),
    expense_id: expenseId,
    description: dynamo.item || "Item",
    quantity: dynamo.quantity || 1,
    unit_price: dynamo.unitCost || 0,
    unit: null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform income data - matches initial_schema income table
function transformIncome(dynamo, farmId, profileId) {
  return {
    id: generateUUID(),
    farm_id: farmId,
    created_by: profileId,
    date: dynamo.date,
    description: dynamo.item || "Income",
    amount: dynamo.amount || 0,
    payment_method: dynamo.paymentMethod || null,
    notes: dynamo.notes || null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform customer data - matches initial_schema customers table
function transformCustomer(dynamo, farmId) {
  const newId = generateUUID();
  idMappings.customers[dynamo.id] = newId;

  return {
    id: newId,
    farm_id: farmId,
    name: dynamo.name,
    email: dynamo.email || null,
    phone: dynamo.phone || null,
    address: dynamo.address || null,
    city: dynamo.city || null,
    state: dynamo.state || null,
    zip_code: dynamo.zipCode || null,
    country: dynamo.country || "USA",
    notes: dynamo.notes || null,
    is_active: true,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform invoice data - matches initial_schema invoices table
function transformInvoice(dynamo, farmId, profileId) {
  const newId = generateUUID();
  idMappings.invoices[dynamo.id] = newId;

  const customerId = idMappings.customers[dynamo.customerID];

  return {
    id: newId,
    farm_id: farmId,
    customer_id: customerId || null,
    created_by: profileId,
    invoice_number: dynamo.invoiceNumber,
    status: dynamo.status || "DRAFT",
    issue_date: dynamo.date,
    due_date: dynamo.dueDate || dynamo.date,
    subtotal: dynamo.subtotal || 0,
    tax_rate: dynamo.taxRate || 0,
    tax_amount: dynamo.taxAmount || 0,
    discount_amount: dynamo.discountAmount || 0,
    grand_total: dynamo.total || 0,
    notes: dynamo.notes || null,
    terms: dynamo.terms || null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform invoice item data - matches initial_schema invoice_line_items table
function transformInvoiceItem(dynamo) {
  const invoiceId = idMappings.invoices[dynamo.invoiceID];
  if (!invoiceId) return null;

  return {
    id: generateUUID(),
    invoice_id: invoiceId,
    description: dynamo.description || "Item",
    quantity: dynamo.quantity || 1,
    unit_price: dynamo.unitPrice || 0,
    unit: dynamo.unit || null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Transform livestock health record - matches initial_schema livestock_health_records
function transformHealthRecord(dynamo) {
  const livestockId = idMappings.livestock[dynamo.livestockID];
  if (!livestockId) return null;

  return {
    id: generateUUID(),
    livestock_id: livestockId,
    record_date: dynamo.date || new Date().toISOString().split("T")[0],
    record_type: dynamo.type || "OTHER",
    description: dynamo.notes || "Medical record",
    medication: dynamo.medicine || null,
    notes: dynamo.notes || null,
    created_at: dynamo.createdAt || new Date().toISOString(),
    updated_at: dynamo.updatedAt || new Date().toISOString(),
  };
}

// Insert data in batches
async function batchInsert(tableName, data, batchSize = 50) {
  if (data.length === 0) {
    console.log(`  No data to import for ${tableName}`);
    return { success: true, count: 0 };
  }

  // Filter out null entries
  data = data.filter((d) => d !== null);

  let inserted = 0;
  let errors = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    const { error } = await supabase.from(tableName).insert(batch);

    if (error) {
      console.error(`  Error inserting into ${tableName}:`, error.message);
      errors.push(error);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  ${tableName}: ${inserted}/${data.length} records imported`);

  return {
    success: errors.length === 0,
    count: inserted,
    errors,
  };
}

async function main() {
  console.log("========================================");
  console.log("HarvesTrackr Supabase Import Script");
  console.log("========================================\n");

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`Export directory not found: ${EXPORT_DIR}`);
    console.error("Please run export-dynamodb.cjs first.");
    process.exit(1);
  }

  const results = [];

  // We need to create a temporary profile for the data import
  // since the initial schema uses profiles table linked to auth.users
  console.log("Note: User data requires Supabase Auth migration (separate step)\n");

  // 1. Import Farms
  console.log("1. Importing Farms...");
  const farms = readExportFile("Farm.json");
  const transformedFarms = farms.map(transformFarm);
  const farmResult = await batchInsert("farms", transformedFarms);
  results.push({ table: "farms", ...farmResult });

  // Get the first farm ID for data that needs a farm reference
  const defaultFarmId = transformedFarms[0]?.id;

  if (!defaultFarmId) {
    console.log("\n   No farms found. Creating a default farm...");
    const defaultFarmData = {
      id: generateUUID(),
      name: "My Farm",
      type: "MIXED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("farms").insert(defaultFarmData);
    if (!error) {
      idMappings.farms["default"] = defaultFarmData.id;
    }
  }

  const farmId = defaultFarmId || idMappings.farms["default"];
  console.log(`   Using farm ID: ${farmId}\n`);

  // 2. Import Customers
  console.log("2. Importing Customers...");
  const customers = readExportFile("Customer.json");
  const transformedCustomers = customers.map((c) => transformCustomer(c, farmId));
  const customerResult = await batchInsert("customers", transformedCustomers);
  results.push({ table: "customers", ...customerResult });

  // 3. Import Livestock
  console.log("3. Importing Livestock...");
  const livestock = readExportFile("Livestock.json");
  const transformedLivestock = livestock.map((l) => transformLivestock(l, farmId));
  const livestockResult = await batchInsert("livestock", transformedLivestock);
  results.push({ table: "livestock", ...livestockResult });

  // 4. Import Livestock Health Records
  console.log("4. Importing Medical Records...");
  const medicalRecords = readExportFile("MedicalRecord.json");
  const transformedHealth = medicalRecords.map(transformHealthRecord).filter(Boolean);
  const healthResult = await batchInsert("livestock_health_records", transformedHealth);
  results.push({ table: "livestock_health_records", ...healthResult });

  // 5. Import Expenses (without created_by since we don't have profiles yet)
  console.log("5. Importing Expenses...");
  const expenses = readExportFile("Expense.json");
  const transformedExpenses = expenses.map((e) => {
    const newId = generateUUID();
    idMappings.expenses[e.id] = newId;
    return {
      id: newId,
      farm_id: farmId,
      date: e.date,
      description: e.vendor || "Expense",
      grand_total: e.grandTotal || 0,
      notes: e.description || null,
      created_at: e.createdAt || new Date().toISOString(),
      updated_at: e.updatedAt || new Date().toISOString(),
    };
  });
  const expenseResult = await batchInsert("expenses", transformedExpenses);
  results.push({ table: "expenses", ...expenseResult });

  // 6. Import Line Items
  console.log("6. Importing Expense Line Items...");
  const lineItems = readExportFile("LineItem.json");
  const transformedLineItems = lineItems.map(transformLineItem).filter(Boolean);
  const lineItemResult = await batchInsert("expense_line_items", transformedLineItems);
  results.push({ table: "expense_line_items", ...lineItemResult });

  // 7. Import Income (without created_by)
  console.log("7. Importing Income...");
  const income = readExportFile("Income.json");
  const transformedIncome = income.map((i) => ({
    id: generateUUID(),
    farm_id: farmId,
    date: i.date,
    description: i.item || "Income",
    amount: i.amount || 0,
    payment_method: i.paymentMethod || null,
    notes: i.notes || null,
    created_at: i.createdAt || new Date().toISOString(),
    updated_at: i.updatedAt || new Date().toISOString(),
  }));
  const incomeResult = await batchInsert("income", transformedIncome);
  results.push({ table: "income", ...incomeResult });

  // 8. Import Invoices (without created_by)
  console.log("8. Importing Invoices...");
  const invoices = readExportFile("Invoice.json");
  const transformedInvoices = invoices.map((inv) => {
    const newId = generateUUID();
    idMappings.invoices[inv.id] = newId;
    return {
      id: newId,
      farm_id: farmId,
      customer_id: idMappings.customers[inv.customerID] || null,
      invoice_number: inv.invoiceNumber,
      status: inv.status || "DRAFT",
      issue_date: inv.date,
      due_date: inv.dueDate || inv.date,
      subtotal: inv.subtotal || 0,
      tax_rate: inv.taxRate || 0,
      tax_amount: inv.taxAmount || 0,
      discount_amount: inv.discountAmount || 0,
      grand_total: inv.total || 0,
      notes: inv.notes || null,
      terms: inv.terms || null,
      created_at: inv.createdAt || new Date().toISOString(),
      updated_at: inv.updatedAt || new Date().toISOString(),
    };
  });
  const invoiceResult = await batchInsert("invoices", transformedInvoices);
  results.push({ table: "invoices", ...invoiceResult });

  // 9. Import Invoice Items
  console.log("9. Importing Invoice Line Items...");
  const invoiceItems = readExportFile("InvoiceItem.json");
  const transformedInvoiceItems = invoiceItems.map(transformInvoiceItem).filter(Boolean);
  const invoiceItemResult = await batchInsert("invoice_line_items", transformedInvoiceItems);
  results.push({ table: "invoice_line_items", ...invoiceItemResult });

  // Print summary
  console.log("\n========================================");
  console.log("Import Summary");
  console.log("========================================\n");

  let totalRecords = 0;
  results.forEach((r) => {
    const status = r.success ? "OK" : "ERRORS";
    console.log(`${r.table}: ${r.count} records [${status}]`);
    totalRecords += r.count;
  });

  console.log(`\nTotal records imported: ${totalRecords}`);

  // Save ID mappings for reference
  const mappingsPath = path.join(EXPORT_DIR, "_id-mappings.json");
  fs.writeFileSync(mappingsPath, JSON.stringify(idMappings, null, 2), "utf-8");
  console.log(`\nID mappings saved to: ${mappingsPath}`);

  console.log("\n========================================");
  console.log("Data NOT imported (tables not in initial schema):");
  console.log("========================================");
  console.log("- Fields (3 records) - no 'fields' table");
  console.log("- Livestock Families (5 records) - uses mother_id/father_id in livestock");
  console.log("- Chicken Flocks (4 records) - no 'chicken_flocks' table");
  console.log("- Egg Logs (42 records) - no 'egg_logs' table");
  console.log("- Inventory Items (3 records) - no 'inventory_items' table");
  console.log("\nTo import this data, add the missing tables to Supabase first.");

  console.log("\n========================================");
  console.log("Next Steps");
  console.log("========================================");
  console.log("1. Migrate users: node scripts/migrate-cognito-users.cjs");
  console.log("2. Link expenses/income to user profiles");
  console.log("3. Migrate S3 receipt images to Supabase Storage");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
