/**
 * Import expenses, line items, and income from DynamoDB export
 * Maps data to correct farms based on original Cognito userId
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, "../dynamodb-export");

// Mapping of original Cognito user IDs to farm names
const COGNITO_TO_FARM = {
  "74c88408-2041-70a6-c023-9dfcbd1495a6": "Nunez Farms",
  "84b83468-90f1-7065-1ba0-60b8cdd6dce2": "mckeachniefarm Farm",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ID mappings
const expenseIdMappings = {};
// Farm lookup: cognitoUserId -> { farmId, supabaseUserId }
const farmLookup = {};

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readExportFile(filename) {
  const filepath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`  File not found: ${filename}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

async function main() {
  console.log("========================================");
  console.log("Importing Expenses, Line Items & Income");
  console.log("========================================\n");

  // Build farm lookup from Cognito user IDs
  console.log("Looking up farms...");
  for (const [cognitoId, farmName] of Object.entries(COGNITO_TO_FARM)) {
    const { data: farm, error } = await supabase
      .from("farms")
      .select("id, name, owner_id")
      .eq("name", farmName)
      .single();

    if (error || !farm) {
      console.log(`  Warning: Could not find farm "${farmName}" - data for this user will be skipped`);
      continue;
    }

    farmLookup[cognitoId] = {
      farmId: farm.id,
      userId: farm.owner_id,
      farmName: farm.name,
    };
    console.log(`  Found: ${farm.name} (${farm.id}) -> Cognito user ${cognitoId.substring(0, 8)}...`);
  }

  if (Object.keys(farmLookup).length === 0) {
    console.error("\nNo farms found! Cannot proceed with import.");
    return;
  }

  console.log("");

  // 1. Import Expenses
  console.log("1. Importing Expenses...");
  const expenses = readExportFile("Expense.json");
  let expenseCount = 0;
  let expenseErrors = 0;
  let expenseSkipped = 0;

  for (const exp of expenses) {
    const farmInfo = farmLookup[exp.userId];
    if (!farmInfo) {
      expenseSkipped++;
      continue;
    }

    const newId = generateUUID();
    expenseIdMappings[exp.id] = newId;

    const { error } = await supabase.from("expenses").insert({
      id: newId,
      farm_id: farmInfo.farmId,
      user_id: farmInfo.userId,
      date: exp.date,
      vendor: exp.vendor || null,
      description: exp.description || exp.vendor || "Expense",
      grand_total: exp.grandTotal || 0,
      receipt_url: exp.receiptImageKey || null,
      receipt_image_url: exp.receiptImageKey || null,
      notes: null,
      created_at: exp.createdAt || new Date().toISOString(),
      updated_at: exp.updatedAt || new Date().toISOString(),
    });

    if (error) {
      console.error(`  Error importing expense ${exp.id}:`, error.message);
      expenseErrors++;
    } else {
      expenseCount++;
    }
  }
  console.log(`  Imported: ${expenseCount}/${expenses.length} expenses (${expenseErrors} errors, ${expenseSkipped} skipped)\n`);

  // 2. Import Line Items
  console.log("2. Importing Line Items...");
  const lineItems = readExportFile("LineItem.json");
  let lineItemCount = 0;
  let lineItemErrors = 0;
  let lineItemSkipped = 0;

  for (const item of lineItems) {
    const expenseId = expenseIdMappings[item.expenseID];

    if (!expenseId) {
      lineItemSkipped++;
      continue;
    }

    const { error } = await supabase.from("expense_line_items").insert({
      id: generateUUID(),
      expense_id: expenseId,
      item: item.item || "Unknown",
      description: item.item || "Unknown",
      category: item.category || "Supplies Purchased",
      quantity: item.quantity || 1,
      unit_cost: item.unitCost || 0,
      unit_price: item.unitCost || 0,
      line_total: item.lineTotal || 0,
      created_at: item.createdAt || new Date().toISOString(),
    });

    if (error) {
      console.error(`  Error importing line item ${item.id}:`, error.message);
      lineItemErrors++;
    } else {
      lineItemCount++;
    }
  }
  console.log(`  Imported: ${lineItemCount}/${lineItems.length} line items (${lineItemErrors} errors, ${lineItemSkipped} skipped)\n`);

  // 3. Import Income
  console.log("3. Importing Income...");
  const incomeRecords = readExportFile("Income.json");
  let incomeCount = 0;
  let incomeErrors = 0;
  let incomeSkipped = 0;

  for (const inc of incomeRecords) {
    const farmInfo = farmLookup[inc.userId];
    if (!farmInfo) {
      incomeSkipped++;
      continue;
    }

    const { error } = await supabase.from("income").insert({
      id: generateUUID(),
      farm_id: farmInfo.farmId,
      user_id: farmInfo.userId,
      date: inc.date,
      description: inc.item || "Income",
      item: inc.item || "Unknown",
      quantity: inc.quantity || 1,
      price: inc.price || 0,
      amount: inc.amount || 0,
      payment_method: mapPaymentMethod(inc.paymentMethod),
      notes: inc.notes || null,
      livestock_id: null,
      created_at: inc.createdAt || new Date().toISOString(),
      updated_at: inc.updatedAt || new Date().toISOString(),
    });

    if (error) {
      console.error(`  Error importing income ${inc.id}:`, error.message);
      incomeErrors++;
    } else {
      incomeCount++;
    }
  }
  console.log(`  Imported: ${incomeCount}/${incomeRecords.length} income records (${incomeErrors} errors, ${incomeSkipped} skipped)\n`);

  // Summary by farm
  console.log("========================================");
  console.log("Import Complete!");
  console.log("========================================");
  console.log(`Total Expenses: ${expenseCount}`);
  console.log(`Total Line Items: ${lineItemCount}`);
  console.log(`Total Income: ${incomeCount}`);
}

function mapPaymentMethod(method) {
  const mapping = {
    "Cash": "CASH",
    "Check": "CHECK",
    "Credit Card": "CREDIT_CARD",
    "Debit Card": "DEBIT_CARD",
    "Bank Transfer": "BANK_TRANSFER",
    "Online": "ONLINE",
    "Other": "OTHER",
  };
  return mapping[method] || "CASH";
}

main().catch(console.error);
