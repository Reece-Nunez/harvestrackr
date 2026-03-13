/**
 * Migrate receipt images from S3 to Supabase Storage
 *
 * Prerequisites:
 * 1. AWS CLI configured with credentials that can access the S3 bucket
 * 2. Run: npm install @aws-sdk/client-s3
 *
 * Usage: node scripts/migrate-receipt-images.cjs
 */

require("dotenv").config({ path: ".env.local" });

const { S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Configuration - UPDATE THESE VALUES
const AWS_REGION = process.env.AWS_REGION || "us-east-1"; // Change if different
const S3_BUCKET = "farmexpensetrackerreceipts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize clients
const s3Client = new S3Client({ region: AWS_REGION });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Get content type from file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };
  return types[ext] || "application/octet-stream";
}

async function main() {
  console.log("==========================================");
  console.log("Migrating Receipt Images: S3 -> Supabase");
  console.log("==========================================\n");

  // Get all expenses with receipt images
  const { data: expenses, error: fetchError } = await supabase
    .from("expenses")
    .select("id, receipt_image_url, farm_id")
    .not("receipt_image_url", "is", null);

  if (fetchError) {
    console.error("Error fetching expenses:", fetchError.message);
    return;
  }

  console.log(`Found ${expenses.length} expenses with receipt images\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const expense of expenses) {
    const s3Key = expense.receipt_image_url;

    // Skip if already a Supabase URL
    if (s3Key.includes("supabase")) {
      skippedCount++;
      continue;
    }

    // Skip if not a valid S3 key
    if (!s3Key.startsWith("receipts/")) {
      console.log(`  Skipping invalid key: ${s3Key}`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`Processing: ${s3Key}`);

      // Download from S3
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
      });

      const s3Response = await s3Client.send(getCommand);
      const imageBuffer = await streamToBuffer(s3Response.Body);

      // Generate new filename for Supabase
      const filename = path.basename(s3Key);
      const supabasePath = `${expense.farm_id}/${expense.id}/${filename}`;
      const contentType = getContentType(filename);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(supabasePath, imageBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`  Upload error: ${uploadError.message}`);
        errorCount++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(supabasePath);

      // Update expense record
      const { error: updateError } = await supabase
        .from("expenses")
        .update({ receipt_image_url: urlData.publicUrl })
        .eq("id", expense.id);

      if (updateError) {
        console.error(`  Update error: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`  ✓ Migrated to: ${supabasePath}`);
      successCount++;
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n==========================================");
  console.log("Migration Complete!");
  console.log("==========================================");
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

main().catch(console.error);
