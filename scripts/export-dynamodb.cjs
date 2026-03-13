/**
 * DynamoDB Export Script for HarvesTrackr Migration
 *
 * This script exports all data from your DynamoDB tables to JSON files.
 *
 * Prerequisites:
 * 1. AWS CLI configured with credentials: aws configure
 * 2. Node.js installed
 * 3. Install dependencies: npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 *
 * Usage:
 *   node scripts/export-dynamodb.js
 *
 * Or with a specific environment:
 *   AMPLIFY_ENV=dev node scripts/export-dynamodb.js
 */

const { DynamoDBClient, ListTablesCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const fs = require("fs");
const path = require("path");

// Configuration
const REGION = process.env.AWS_REGION || "us-east-1";
const OUTPUT_DIR = path.join(__dirname, "../dynamodb-export");
const AMPLIFY_ENV = process.env.AMPLIFY_ENV || ""; // e.g., "dev", "staging", "prod"

// Tables from your GraphQL schema (Amplify naming: TableName-{apiId}-{env})
const EXPECTED_TABLES = [
  "User",
  "Expense",
  "LineItem",
  "Income",
  "Field",
  "Livestock",
  "LivestockFamily",
  "MedicalRecord",
  "ChickenFlock",
  "EggLog",
  "InventoryItem",
  "Customer",
  "Invoice",
  "InvoiceItem",
  "Product",
  "Farm",
  "TeamMember",
  "TeamInvitation",
];

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function listAllTables() {
  const tables = [];
  let lastEvaluatedTableName;

  do {
    const command = new ListTablesCommand({
      ExclusiveStartTableName: lastEvaluatedTableName,
    });
    const response = await client.send(command);
    tables.push(...(response.TableNames || []));
    lastEvaluatedTableName = response.LastEvaluatedTableName;
  } while (lastEvaluatedTableName);

  return tables;
}

async function scanTable(tableName) {
  const items = [];
  let lastEvaluatedKey;

  console.log(`  Scanning table: ${tableName}...`);

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await client.send(command);

    // Convert DynamoDB format to plain JSON
    const unmarshalled = (response.Items || []).map(item => unmarshall(item));
    items.push(...unmarshalled);

    lastEvaluatedKey = response.LastEvaluatedKey;

    if (items.length % 1000 === 0 && items.length > 0) {
      console.log(`    ... ${items.length} items scanned`);
    }
  } while (lastEvaluatedKey);

  console.log(`  Found ${items.length} items in ${tableName}`);
  return items;
}

async function exportTable(tableName, outputPath) {
  try {
    const items = await scanTable(tableName);

    // Write to file
    fs.writeFileSync(
      outputPath,
      JSON.stringify(items, null, 2),
      "utf-8"
    );

    console.log(`  Exported to: ${outputPath}`);
    return { tableName, count: items.length, success: true };
  } catch (error) {
    console.error(`  Error exporting ${tableName}:`, error.message);
    return { tableName, count: 0, success: false, error: error.message };
  }
}

async function main() {
  console.log("========================================");
  console.log("HarvesTrackr DynamoDB Export Script");
  console.log("========================================\n");

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // List all tables
  console.log("Fetching table list from DynamoDB...\n");
  const allTables = await listAllTables();

  console.log(`Found ${allTables.length} tables in your AWS account:\n`);
  allTables.forEach(t => console.log(`  - ${t}`));
  console.log("");

  // Filter to find your app's tables
  // Amplify tables typically follow pattern: ModelName-{apiId}-{env}
  const appTables = allTables.filter(tableName => {
    return EXPECTED_TABLES.some(expected =>
      tableName.startsWith(expected + "-") ||
      tableName === expected
    );
  });

  if (appTables.length === 0) {
    console.log("\nNo matching tables found!");
    console.log("\nLooking for tables that start with these names:");
    EXPECTED_TABLES.forEach(t => console.log(`  - ${t}`));
    console.log("\nYour tables might have a different naming pattern.");
    console.log("Please check your Amplify configuration or AWS Console.\n");

    // Export all tables anyway if user wants
    console.log("Exporting ALL tables instead...\n");

    const results = [];
    for (const tableName of allTables) {
      const outputPath = path.join(OUTPUT_DIR, `${tableName}.json`);
      const result = await exportTable(tableName, outputPath);
      results.push(result);
    }

    printSummary(results);
    return;
  }

  console.log(`\nFound ${appTables.length} HarvesTrackr tables:\n`);
  appTables.forEach(t => console.log(`  - ${t}`));
  console.log("\n");

  // Export each table
  console.log("Starting export...\n");
  const results = [];

  for (const tableName of appTables) {
    // Extract the model name for cleaner filenames
    const modelName = EXPECTED_TABLES.find(expected =>
      tableName.startsWith(expected + "-")
    ) || tableName;

    const outputPath = path.join(OUTPUT_DIR, `${modelName}.json`);
    const result = await exportTable(tableName, outputPath);
    results.push(result);
    console.log("");
  }

  printSummary(results);

  // Create a combined export with metadata
  const metadata = {
    exportDate: new Date().toISOString(),
    region: REGION,
    tables: results,
    totalRecords: results.reduce((sum, r) => sum + r.count, 0),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "_export-metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );
}

function printSummary(results) {
  console.log("========================================");
  console.log("Export Summary");
  console.log("========================================\n");

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total tables: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total records: ${results.reduce((sum, r) => sum + r.count, 0)}\n`);

  if (successful.length > 0) {
    console.log("Successful exports:");
    successful.forEach(r => {
      console.log(`  ${r.tableName}: ${r.count} records`);
    });
    console.log("");
  }

  if (failed.length > 0) {
    console.log("Failed exports:");
    failed.forEach(r => {
      console.log(`  ${r.tableName}: ${r.error}`);
    });
    console.log("");
  }

  console.log(`\nExported files are in: ${OUTPUT_DIR}`);
  console.log("\nNext steps:");
  console.log("1. Review the exported JSON files");
  console.log("2. Run the import script to load data into Supabase");
  console.log("   node scripts/import-to-supabase.js");
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
