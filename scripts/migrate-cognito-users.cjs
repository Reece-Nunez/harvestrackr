/**
 * Cognito to Supabase User Migration Script
 *
 * This script migrates users from AWS Cognito to Supabase Auth.
 * Since passwords can't be exported from Cognito, users will need to reset their passwords.
 *
 * Prerequisites:
 * 1. Export Cognito users: aws cognito-idp list-users --user-pool-id YOUR_POOL_ID > cognito-users.json
 * 2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage:
 *   node scripts/migrate-cognito-users.js
 *
 * Options:
 *   --send-reset-emails    Send password reset emails to all users
 *   --dry-run              Preview what would be imported without making changes
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COGNITO_EXPORT_FILE = path.join(__dirname, "../dynamodb-export/cognito-users.json");
const DYNAMODB_USERS_FILE = path.join(__dirname, "../dynamodb-export/User.json");

// Parse command line args
const args = process.argv.slice(2);
const SEND_RESET_EMAILS = args.includes("--send-reset-emails");
const DRY_RUN = args.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials!");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Initialize Supabase Admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate a random temporary password
function generateTempPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Parse Cognito user attributes
function parseCognitoUser(cognitoUser) {
  const attributes = {};
  (cognitoUser.Attributes || []).forEach((attr) => {
    attributes[attr.Name] = attr.Value;
  });

  return {
    username: cognitoUser.Username,
    email: attributes.email,
    email_verified: attributes.email_verified === "true",
    sub: attributes.sub,
    firstName: attributes.given_name || attributes["custom:firstName"],
    lastName: attributes.family_name || attributes["custom:lastName"],
    phone: attributes.phone_number,
    created: cognitoUser.UserCreateDate,
    status: cognitoUser.UserStatus,
    enabled: cognitoUser.Enabled,
  };
}

// Load DynamoDB user data for additional profile info
function loadDynamoDBUsers() {
  if (!fs.existsSync(DYNAMODB_USERS_FILE)) {
    console.log("DynamoDB users file not found, skipping profile enrichment");
    return {};
  }

  const users = JSON.parse(fs.readFileSync(DYNAMODB_USERS_FILE, "utf-8"));
  const userMap = {};

  users.forEach((user) => {
    if (user.sub) userMap[user.sub] = user;
    if (user.email) userMap[user.email.toLowerCase()] = user;
  });

  return userMap;
}

async function createSupabaseUser(userData, dynamoProfile) {
  const email = userData.email?.toLowerCase();

  if (!email) {
    console.log(`  Skipping user ${userData.username} - no email`);
    return { success: false, reason: "no_email" };
  }

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existing) {
    console.log(`  User ${email} already exists, skipping`);
    return { success: false, reason: "already_exists", userId: existing.id };
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create user: ${email}`);
    return { success: true, dryRun: true };
  }

  // Create the auth user with a temporary password
  const tempPassword = generateTempPassword();

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: userData.email_verified, // Auto-confirm if they were verified in Cognito
    user_metadata: {
      first_name: userData.firstName || dynamoProfile?.firstName || "",
      last_name: userData.lastName || dynamoProfile?.lastName || "",
      migrated_from: "cognito",
      cognito_sub: userData.sub,
    },
  });

  if (authError) {
    console.error(`  Error creating user ${email}:`, authError.message);
    return { success: false, reason: "auth_error", error: authError.message };
  }

  console.log(`  Created auth user: ${email} (ID: ${authUser.user.id})`);

  // Create the profile in the users table
  const { error: profileError } = await supabase.from("users").upsert({
    id: authUser.user.id,
    email: email,
    first_name: userData.firstName || dynamoProfile?.firstName || "User",
    last_name: userData.lastName || dynamoProfile?.lastName || "",
    avatar_url: null,
    preferences: dynamoProfile?.preferences
      ? JSON.parse(dynamoProfile.preferences)
      : {},
    created_at: userData.created || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error(`  Error creating profile for ${email}:`, profileError.message);
  }

  return {
    success: true,
    userId: authUser.user.id,
    email: email,
    tempPassword: tempPassword,
  };
}

async function sendPasswordResetEmail(email) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send reset email to: ${email}`);
    return { success: true };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SUPABASE_URL.replace(".supabase.co", "")}/reset-password`,
  });

  if (error) {
    console.error(`  Error sending reset email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }

  console.log(`  Sent password reset email to: ${email}`);
  return { success: true };
}

async function main() {
  console.log("========================================");
  console.log("Cognito to Supabase User Migration");
  console.log("========================================\n");

  if (DRY_RUN) {
    console.log("*** DRY RUN MODE - No changes will be made ***\n");
  }

  // Check for Cognito export file
  if (!fs.existsSync(COGNITO_EXPORT_FILE)) {
    console.log("Cognito users file not found!");
    console.log(`Expected location: ${COGNITO_EXPORT_FILE}\n`);
    console.log("To export your Cognito users, run:");
    console.log("  aws cognito-idp list-users --user-pool-id YOUR_USER_POOL_ID --output json > cognito-users.json\n");
    console.log("To find your User Pool ID:");
    console.log("  aws cognito-idp list-user-pools --max-results 10\n");
    process.exit(1);
  }

  // Load data
  const cognitoData = JSON.parse(fs.readFileSync(COGNITO_EXPORT_FILE, "utf-8"));
  const cognitoUsers = cognitoData.Users || cognitoData;
  const dynamoUsers = loadDynamoDBUsers();

  console.log(`Found ${cognitoUsers.length} Cognito users\n`);

  // Process each user
  const results = {
    created: [],
    skipped: [],
    errors: [],
  };

  for (const cognitoUser of cognitoUsers) {
    const userData = parseCognitoUser(cognitoUser);
    console.log(`Processing: ${userData.email || userData.username}`);

    // Skip disabled users
    if (!userData.enabled) {
      console.log(`  Skipping disabled user`);
      results.skipped.push({ ...userData, reason: "disabled" });
      continue;
    }

    // Get additional profile data from DynamoDB
    const dynamoProfile =
      dynamoUsers[userData.sub] || dynamoUsers[userData.email?.toLowerCase()];

    // Create the user
    const result = await createSupabaseUser(userData, dynamoProfile);

    if (result.success) {
      results.created.push({
        email: userData.email,
        userId: result.userId,
        tempPassword: result.tempPassword,
      });

      // Send password reset email if requested
      if (SEND_RESET_EMAILS && userData.email) {
        await sendPasswordResetEmail(userData.email);
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      }
    } else if (result.reason === "already_exists") {
      results.skipped.push({ ...userData, reason: "already_exists" });
    } else {
      results.errors.push({ ...userData, error: result.error || result.reason });
    }
  }

  // Print summary
  console.log("\n========================================");
  console.log("Migration Summary");
  console.log("========================================\n");

  console.log(`Created: ${results.created.length} users`);
  console.log(`Skipped: ${results.skipped.length} users`);
  console.log(`Errors: ${results.errors.length} users\n`);

  // Save results
  const resultsPath = path.join(__dirname, "../user-migration-results.json");
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        dryRun: DRY_RUN,
        sendResetEmails: SEND_RESET_EMAILS,
        results,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`Results saved to: ${resultsPath}\n`);

  if (!SEND_RESET_EMAILS && results.created.length > 0) {
    console.log("========================================");
    console.log("Next Steps");
    console.log("========================================");
    console.log("Users have been created with temporary passwords.");
    console.log("To send password reset emails to all users, run:");
    console.log("  node scripts/migrate-cognito-users.js --send-reset-emails\n");
    console.log("Or manually trigger reset for specific users in Supabase Dashboard.\n");
  }

  if (results.errors.length > 0) {
    console.log("\nUsers with errors:");
    results.errors.forEach((u) => {
      console.log(`  - ${u.email}: ${u.error}`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
