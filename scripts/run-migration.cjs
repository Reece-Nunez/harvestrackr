/**
 * Run the database migration via Supabase
 */
require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log("Running database migration...\n");

  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/00002_simplified_schema.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8");

  // Split by semicolons and run each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let success = 0;
  let failed = 0;

  for (const statement of statements) {
    if (!statement || statement.startsWith("--")) continue;

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });

      if (error) {
        // Try direct query
        const { error: error2 } = await supabase.from("_dummy").select().limit(0);
        if (error2 && error2.message.includes("does not exist")) {
          // Expected, table doesn't exist yet
        }
        console.log("  Statement requires SQL Editor");
        failed++;
      } else {
        success++;
      }
    } catch (err) {
      failed++;
    }
  }

  console.log(`\nCompleted: ${success} successful, ${failed} need manual run`);

  if (failed > 0) {
    console.log("\n========================================");
    console.log("MANUAL STEP REQUIRED");
    console.log("========================================");
    console.log("\nThe migration needs to be run manually in Supabase SQL Editor.");
    console.log("\n1. Go to: https://supabase.com/dashboard/project/fsavvkjgjaqciebkzykk/sql/new");
    console.log("2. Copy the SQL from: supabase/migrations/00002_simplified_schema.sql");
    console.log("3. Paste it in the SQL Editor and click 'Run'\n");
  }
}

runMigration().catch(console.error);
