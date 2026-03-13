import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Query pg_tables to see what exists
  const { data, error } = await supabase.rpc("", {}).maybeSingle();

  // Fallback: just try selecting from each table
  const tables = [
    "users", "farms", "team_members", "team_invitations",
    "expenses", "expense_line_items", "line_items", "income",
    "livestock", "fields", "chicken_flocks", "customers",
    "invoices", "invoice_items", "inventory_items",
    "medical_records", "egg_logs", "livestock_families",
    "import_history", "products",
  ];

  console.log("Checking tables...\n");

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      console.log(`  ✗ ${table} — ${error.message}`);
    } else {
      console.log(`  ✓ ${table} — exists (${data.length} sample row(s))`);
    }
  }
}

main();
