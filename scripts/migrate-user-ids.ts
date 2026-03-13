/**
 * User ID Migration Script
 *
 * Reassigns data from old Cognito user IDs to new Supabase auth user IDs
 * by matching on email address.
 *
 * Usage:
 *   npx tsx scripts/migrate-user-ids.ts
 *
 * What it does:
 *   1. Fetches all rows from the `users` table (old records with Cognito IDs)
 *   2. Lists all Supabase auth users (new IDs)
 *   3. Matches by email
 *   4. Updates all related tables to use the new user ID
 *   5. Updates the `users` table row itself to the new ID
 *
 * Run this AFTER users have signed up on the new Supabase-based app.
 * Safe to run multiple times — it skips users that are already migrated.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

// Service role client — bypasses RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Tables and the columns that reference user IDs
const USER_ID_TABLES = [
  { table: "farms", column: "owner_id" },
  { table: "expenses", column: "user_id" },
  { table: "income", column: "user_id" },
  { table: "team_members", column: "user_id" },
  { table: "team_members", column: "invited_by" },
  { table: "team_invitations", column: "invited_by_user_id" },
] as const;

interface MigrationResult {
  email: string;
  oldId: string;
  newId: string;
  updates: { table: string; column: string; count: number }[];
  error?: string;
}

async function getAuthUsers(): Promise<Map<string, string>> {
  const emailToId = new Map<string, string>();

  // Supabase admin API paginates at 1000
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("Error listing auth users:", error.message);
      break;
    }

    for (const user of data.users) {
      if (user.email) {
        emailToId.set(user.email.toLowerCase(), user.id);
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return emailToId;
}

async function migrateUser(
  oldId: string,
  newId: string,
  email: string
): Promise<MigrationResult> {
  const result: MigrationResult = { email, oldId, newId, updates: [] };

  if (oldId === newId) {
    console.log(`  ⏭ ${email} — IDs already match, skipping`);
    return result;
  }

  // Update each table
  for (const { table, column } of USER_ID_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update({ [column]: newId })
        .eq(column, oldId)
        .select("id");

      const count = data?.length ?? 0;

      if (error) {
        // Table might not exist or column might be nullable — not fatal
        console.warn(`  ⚠ ${table}.${column}: ${error.message}`);
      } else if (count > 0) {
        console.log(`  ✓ ${table}.${column}: ${count} row(s) updated`);
        result.updates.push({ table, column, count });
      }
    } catch (err: any) {
      console.warn(`  ⚠ ${table}.${column}: ${err.message}`);
    }
  }

  // Update the users table row itself (change the primary key)
  // We need to: insert new row, then delete old row (can't update PK directly)
  try {
    // Get the old user row
    const { data: oldUser, error: fetchErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", oldId)
      .single();

    if (fetchErr || !oldUser) {
      console.warn(`  ⚠ Could not fetch old user row: ${fetchErr?.message}`);
    } else {
      // Check if a users row with newId already exists
      const { data: existingNew } = await supabase
        .from("users")
        .select("id")
        .eq("id", newId)
        .single();

      if (existingNew) {
        // New user row exists — update it with the old profile data
        const { error: updateErr } = await supabase
          .from("users")
          .update({
            first_name: oldUser.first_name,
            last_name: oldUser.last_name,
            avatar_url: oldUser.avatar_url,
            preferences: oldUser.preferences,
          })
          .eq("id", newId);

        if (updateErr) {
          console.warn(`  ⚠ Failed to update new user row: ${updateErr.message}`);
        } else {
          // Delete the old row
          await supabase.from("users").delete().eq("id", oldId);
          console.log(`  ✓ users: merged profile into new ID, deleted old row`);
        }
      } else {
        // No new row — insert with new ID, delete old
        const { id: _removed, ...userData } = oldUser;
        const { error: insertErr } = await supabase
          .from("users")
          .insert({ ...userData, id: newId });

        if (insertErr) {
          console.warn(`  ⚠ Failed to insert new user row: ${insertErr.message}`);
        } else {
          await supabase.from("users").delete().eq("id", oldId);
          console.log(`  ✓ users: migrated row to new ID`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠ users table migration: ${err.message}`);
  }

  return result;
}

async function main() {
  console.log("=== User ID Migration ===\n");

  // 1. Get all Supabase auth users (new IDs)
  console.log("Fetching Supabase auth users...");
  const authUsers = await getAuthUsers();
  console.log(`Found ${authUsers.size} auth user(s)\n`);

  // 2. Get all rows from users table (may contain old Cognito IDs)
  console.log("Fetching users table...");
  const { data: dbUsers, error } = await supabase
    .from("users")
    .select("id, email");

  if (error) {
    console.error("Error fetching users table:", error.message);
    process.exit(1);
  }

  console.log(`Found ${dbUsers?.length ?? 0} user(s) in database\n`);

  if (!dbUsers || dbUsers.length === 0) {
    console.log("No users to migrate.");
    return;
  }

  // 3. Match and migrate
  const results: MigrationResult[] = [];
  let migrated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const dbUser of dbUsers) {
    const email = dbUser.email?.toLowerCase();
    if (!email) {
      console.log(`⏭ User ${dbUser.id} has no email, skipping`);
      skipped++;
      continue;
    }

    const newId = authUsers.get(email);
    if (!newId) {
      console.log(`⚠ ${email} — no matching Supabase auth account (not signed up yet?)`);
      noMatch++;
      continue;
    }

    if (dbUser.id === newId) {
      console.log(`⏭ ${email} — already migrated`);
      skipped++;
      continue;
    }

    console.log(`🔄 Migrating ${email}: ${dbUser.id} → ${newId}`);
    const result = await migrateUser(dbUser.id, newId, email);
    results.push(result);
    migrated++;
  }

  // 4. Summary
  console.log("\n=== Migration Summary ===");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already done): ${skipped}`);
  console.log(`No auth match: ${noMatch}`);

  if (results.length > 0) {
    console.log("\nDetails:");
    for (const r of results) {
      const totalUpdated = r.updates.reduce((sum, u) => sum + u.count, 0);
      console.log(`  ${r.email}: ${totalUpdated} total row(s) updated`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
