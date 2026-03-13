/**
 * Import remaining data: fields, chicken flocks, egg logs, inventory items, livestock families
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPORT_DIR = path.join(__dirname, "../dynamodb-export");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ID mappings
const idMappings = {
  fields: {},
  chickenFlocks: {},
  livestock: {},
};

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

async function batchInsert(tableName, data, batchSize = 50) {
  if (data.length === 0) {
    console.log(`  No data to import for ${tableName}`);
    return { success: true, count: 0 };
  }

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
  return { success: errors.length === 0, count: inserted, errors };
}

async function main() {
  console.log("========================================");
  console.log("Importing Remaining Data");
  console.log("========================================\n");

  // Get existing farm ID
  const { data: farms } = await supabase.from("farms").select("id").limit(1);
  const farmId = farms?.[0]?.id;

  if (!farmId) {
    console.error("No farm found! Run import-to-supabase.cjs first.");
    process.exit(1);
  }
  console.log(`Using farm ID: ${farmId}\n`);

  // Load existing livestock mappings
  const { data: existingLivestock } = await supabase.from("livestock").select("id, tag_number");
  existingLivestock?.forEach((l) => {
    // tag_number contains part of the old ID
    idMappings.livestock[l.tag_number] = l.id;
  });

  // Load old livestock data to map old IDs
  const oldLivestock = readExportFile("Livestock.json");
  oldLivestock.forEach((l) => {
    const tagNumber = l.id.substring(0, 20);
    const existingMatch = existingLivestock?.find((e) => e.tag_number === tagNumber);
    if (existingMatch) {
      idMappings.livestock[l.id] = existingMatch.id;
    }
  });

  const results = [];

  // 1. Import Fields
  console.log("1. Importing Fields...");
  const fields = readExportFile("Field.json");
  const transformedFields = fields.map((f) => {
    const newId = generateUUID();
    idMappings.fields[f.id] = newId;
    return {
      id: newId,
      farm_id: farmId,
      name: f.name,
      acres: f.acres || null,
      description: null,
      notes: f.notes || null,
      created_at: f.createdAt || new Date().toISOString(),
      updated_at: f.updatedAt || new Date().toISOString(),
    };
  });
  const fieldResult = await batchInsert("fields", transformedFields);
  results.push({ table: "fields", ...fieldResult });

  // 2. Import Chicken Flocks
  console.log("2. Importing Chicken Flocks...");
  const flocks = readExportFile("ChickenFlock.json");
  const transformedFlocks = flocks.map((f) => {
    const newId = generateUUID();
    idMappings.chickenFlocks[f.id] = newId;
    return {
      id: newId,
      farm_id: farmId,
      breed: f.breed,
      count: f.count || 0,
      has_rooster: f.hasRooster || false,
      coop_location: null,
      notes: f.notes || null,
      created_at: f.createdAt || new Date().toISOString(),
      updated_at: f.updatedAt || new Date().toISOString(),
    };
  });
  const flockResult = await batchInsert("chicken_flocks", transformedFlocks);
  results.push({ table: "chicken_flocks", ...flockResult });

  // 3. Import Egg Logs
  console.log("3. Importing Egg Logs...");
  const eggLogs = readExportFile("EggLog.json");
  const transformedEggLogs = eggLogs
    .map((e) => {
      const flockId = idMappings.chickenFlocks[e.chickenFlockID];
      if (!flockId) return null;
      return {
        id: generateUUID(),
        flock_id: flockId,
        date: e.date,
        eggs_collected: e.eggsCollected || 0,
        notes: null,
        created_at: e.createdAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
  const eggResult = await batchInsert("egg_logs", transformedEggLogs);
  results.push({ table: "egg_logs", ...eggResult });

  // 4. Import Inventory Items
  console.log("4. Importing Inventory Items...");
  const inventory = readExportFile("InventoryItem.json");
  const transformedInventory = inventory.map((i) => ({
    id: generateUUID(),
    farm_id: farmId,
    name: i.name,
    type: (i.type || "OTHER").toUpperCase(),
    quantity: i.quantity || 0,
    unit: null,
    location: i.location || null,
    acquired_date: i.acquiredDate || null,
    expiry_date: null,
    cost: null,
    notes: i.notes || null,
    created_at: i.createdAt || new Date().toISOString(),
    updated_at: i.updatedAt || new Date().toISOString(),
  }));
  const inventoryResult = await batchInsert("inventory_items", transformedInventory);
  results.push({ table: "inventory_items", ...inventoryResult });

  // 5. Import Livestock Families
  console.log("5. Importing Livestock Families...");
  const families = readExportFile("LivestockFamily.json");
  const transformedFamilies = families
    .map((f) => {
      const parentId = idMappings.livestock[f.parentID];
      const childId = idMappings.livestock[f.childID];
      if (!parentId || !childId) {
        console.log(`  Skipping family: parent=${f.parentID}, child=${f.childID} (not found)`);
        return null;
      }
      return {
        id: generateUUID(),
        parent_id: parentId,
        child_id: childId,
        relationship_type: "PARENT",
        created_at: f.createdAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
  const familyResult = await batchInsert("livestock_families", transformedFamilies);
  results.push({ table: "livestock_families", ...familyResult });

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
  console.log("\n========================================");
  console.log("All data migration complete!");
  console.log("========================================");
}

main().catch(console.error);
