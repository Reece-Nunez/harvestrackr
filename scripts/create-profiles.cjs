/**
 * Create profiles for migrated users and link them to farms
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("========================================");
  console.log("Creating Profiles for Migrated Users");
  console.log("========================================\n");

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Error fetching users:", authError);
    return;
  }

  const users = authData.users;
  console.log(`Found ${users.length} auth users\n`);

  // Get existing farm
  const { data: farms } = await supabase.from("farms").select("id").limit(1);
  const farmId = farms?.[0]?.id;
  console.log(`Using farm ID: ${farmId}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    console.log(`Processing: ${user.email}`);

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existingProfile) {
      console.log(`  Profile already exists, skipping`);
      skipped++;
      continue;
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.first_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`.trim()
        : user.email.split("@")[0],
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error(`  Error creating profile:`, profileError.message);
      errors++;
      continue;
    }

    console.log(`  Created profile`);

    // Add user to farm as member (if farm exists)
    if (farmId) {
      const { error: memberError } = await supabase.from("farm_members").insert({
        farm_id: farmId,
        user_id: user.id,
        role: "VIEWER", // Default role, owner can upgrade later
        joined_at: new Date().toISOString(),
      });

      if (memberError && !memberError.message.includes("duplicate")) {
        console.error(`  Error adding to farm:`, memberError.message);
      } else if (!memberError) {
        console.log(`  Added to farm as VIEWER`);
      }
    }

    created++;
  }

  console.log("\n========================================");
  console.log("Summary");
  console.log("========================================");
  console.log(`Created: ${created} profiles`);
  console.log(`Skipped: ${skipped} (already exist)`);
  console.log(`Errors: ${errors}`);

  console.log("\n========================================");
  console.log("Migration Complete!");
  console.log("========================================");
  console.log("\nUsers can now:");
  console.log("1. Go to your app's login page");
  console.log("2. Click 'Forgot Password'");
  console.log("3. Enter their email to receive a password reset link");
  console.log("4. Set a new password and log in");
}

main().catch(console.error);
